const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /order/create
 * Body: { service_id, lat, long, tgl_kunjungan, catatan? }
 */
const createOrder = async (req, res, next) => {
  try {
    const { service_id, lat, long, tgl_kunjungan, catatan, metode_pembayaran } = req.body;
    const id_user = req.user.id_user;

    const svcCheck = await query(
      'SELECT id_service FROM services WHERE id_service = ? AND is_active = 1',
      [service_id]
    );
    if (svcCheck.length === 0) {
      return res.status(404).json({ message: 'Kategori jasa tidak ditemukan atau tidak aktif.' });
    }

    const BIAYA_KUNJUNGAN = 50000;
    const paymentMethod = metode_pembayaran || 'Transfer Bank';

    const result = await query(
      `INSERT INTO orders (id_user, id_service, tgl_kunjungan, status_order, biaya_kunjungan, metode_pembayaran, latitude, longitude, catatan)
       VALUES (?, ?, ?, 'Menunggu', ?, ?, ?, ?, ?)`,
      [id_user, service_id, tgl_kunjungan, BIAYA_KUNJUNGAN, paymentMethod, lat || null, long || null, catatan || null]
    );

    res.status(201).json({
      message: 'Pesanan berhasil dibuat.',
      order_id: result.insertId,
      status: 'Menunggu',
      biaya_kunjungan: BIAYA_KUNJUNGAN,
      metode_pembayaran: paymentMethod,
      tgl_kunjungan,
      lokasi: { lat, long },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /order
 * Pelanggan: pesanan miliknya | Mitra: pesanan yang ditugaskan | Admin: semua
 */
const getOrders = async (req, res, next) => {
  try {
    const { id_user, role } = req.user;
    let rows;

    if (role === 'Pelanggan') {
      rows = await query(
        `SELECT o.id_order, o.id_tech, o.tgl_kunjungan, o.status_order, o.biaya_kunjungan,
                s.nama_service, u_mitra.nama AS nama_mitra
         FROM orders o
         JOIN services s ON s.id_service = o.id_service
         LEFT JOIN technicians t ON t.id_tech = o.id_tech
         LEFT JOIN users u_mitra ON u_mitra.id_user = t.id_user
         WHERE o.id_user = ?
         ORDER BY o.created_at DESC`,
        [id_user]
      );
    } else if (role === 'Mitra') {
      const techRows = await query('SELECT id_tech FROM technicians WHERE id_user = ?', [id_user]);
      if (techRows.length === 0) return res.status(404).json({ message: 'Data teknisi tidak ditemukan.' });
      const id_tech = techRows[0].id_tech;

      rows = await query(
        `SELECT o.id_order, o.id_tech, o.tgl_kunjungan, o.status_order, o.biaya_kunjungan,
                s.nama_service, u_p.nama AS nama_pelanggan, u_p.no_hp
         FROM orders o
         JOIN services s ON s.id_service = o.id_service
         JOIN users u_p ON u_p.id_user = o.id_user
         WHERE o.id_tech = ?
         ORDER BY o.created_at DESC`,
        [id_tech]
      );
    } else {
      // Admin
      rows = await query(
        `SELECT o.id_order, o.id_tech, o.tgl_kunjungan, o.status_order, o.biaya_kunjungan,
                s.nama_service, u_p.nama AS nama_pelanggan, u_m.nama AS nama_mitra
         FROM orders o
         JOIN services s ON s.id_service = o.id_service
         JOIN users u_p ON u_p.id_user = o.id_user
         LEFT JOIN technicians t ON t.id_tech = o.id_tech
         LEFT JOIN users u_m ON u_m.id_user = t.id_user
         ORDER BY o.created_at DESC`
      );
    }

    res.json({ orders: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /order/:id
 * Detail satu pesanan — hanya pemilik, mitra terkait, atau admin.
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_user, role } = req.user;

    const rows = await query(
      `SELECT o.id_order, o.tgl_kunjungan, o.status_order, o.biaya_kunjungan, o.metode_pembayaran, o.latitude, o.longitude, o.catatan,
              o.id_user, o.id_tech,
              s.nama_service,
              u_p.nama AS nama_pelanggan, u_p.no_hp AS hp_pelanggan,
              u_m.nama AS nama_mitra,   u_m.no_hp AS hp_mitra,
              n.id_nego, n.deskripsi_kerusakan,
              n.harga_barang, n.biaya_jasa, n.total_biaya, n.status_acc,
              r.id_rating, r.nilai AS rating_nilai, r.komentar AS rating_komentar
       FROM orders o
       JOIN services s ON s.id_service = o.id_service
       JOIN users u_p  ON u_p.id_user  = o.id_user
       LEFT JOIN technicians t ON t.id_tech  = o.id_tech
       LEFT JOIN users u_m     ON u_m.id_user = t.id_user
       LEFT JOIN negotiations n ON n.id_order = o.id_order
       LEFT JOIN ratings r ON r.id_order = o.id_order
       WHERE o.id_order = ?`,
      [id]
    );

    if (rows.length === 0) throw createError(404, 'Pesanan tidak ditemukan.');

    const order = rows[0];

    // Otorisasi
    let techId = null;
    if (role === 'Mitra') {
      const techRows = await query('SELECT id_tech FROM technicians WHERE id_user = ?', [id_user]);
      techId = techRows[0]?.id_tech ?? null;
    }

    const isOwner = role === 'Pelanggan' && order.id_user === id_user;
    const isMitra = role === 'Mitra'     && techId !== null && techId === order.id_tech;
    const isAdmin = role === 'Admin';

    if (!isOwner && !isMitra && !isAdmin) throw createError(403, 'Tidak memiliki akses ke pesanan ini.');

    res.json({ order });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /order/:id/assign
 * Admin menugaskan teknisi ke pesanan.
 * Body: { id_tech }
 */
const assignTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_tech } = req.body;

    const techCheck = await query(
      `SELECT id_tech FROM technicians WHERE id_tech = ? AND status_verifikasi = 'Terverifikasi'`,
      [id_tech]
    );
    if (techCheck.length === 0) {
      return res.status(404).json({ message: 'Teknisi tidak ditemukan atau belum terverifikasi.' });
    }

    const result = await query(
      `UPDATE orders
       SET id_tech = ?, status_order = 'Dikonfirmasi', updated_at = NOW()
       WHERE id_order = ? AND status_order = 'Menunggu'`,
      [id_tech, id]
    );

    if (result.affectedRows === 0) throw createError(400, 'Pesanan tidak ditemukan atau sudah dikonfirmasi.');

    res.json({ message: 'Teknisi berhasil ditugaskan.', order: { id_order: parseInt(id), status_order: 'Dikonfirmasi' } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /order/:id/status
 * Update status pesanan.
 * Body: { status }
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
      `UPDATE orders SET status_order = ?, updated_at = NOW() WHERE id_order = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) throw createError(404, 'Pesanan tidak ditemukan.');

    res.json({ message: 'Status pesanan berhasil diupdate.', order: { id_order: parseInt(id), status_order: status } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /order/:id/rating
 * Submit rating untuk order.
 * Body: { nilai, komentar }
 */
const submitRating = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nilai, komentar } = req.body;
    const { id_user } = req.user;

    const nilaiInt = parseInt(nilai);
    if (isNaN(nilaiInt) || nilaiInt < 1 || nilaiInt > 5) {
      return res.status(400).json({ message: 'Nilai rating harus antara 1 dan 5.' });
    }

    // Cek pesanan
    const orders = await query('SELECT * FROM orders WHERE id_order = ? AND id_user = ?', [id, id_user]);
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan atau Anda tidak memiliki akses.' });
    }
    const order = orders[0];

    if (order.status_order !== 'Selesai') {
      return res.status(400).json({ message: 'Rating hanya dapat diberikan pada pesanan yang sudah selesai.' });
    }

    if (!order.id_tech) {
      return res.status(400).json({ message: 'Pesanan ini tidak memiliki teknisi.' });
    }

    // Cek apakah sudah di-rating
    const existing = await query('SELECT id_rating FROM ratings WHERE id_order = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Pesanan ini sudah pernah diberi rating.' });
    }

    // Insert rating
    await query(
      'INSERT INTO ratings (id_order, id_tech, id_pelanggan, nilai, komentar) VALUES (?, ?, ?, ?, ?)',
      [id, order.id_tech, id_user, nilaiInt, komentar || null]
    );

    // Update rata-rata rating teknisi
    const avgQuery = await query(
      'SELECT AVG(nilai) as rata2 FROM ratings WHERE id_tech = ?',
      [order.id_tech]
    );
    const avg = avgQuery[0].rata2 || 0;
    
    await query(
      'UPDATE technicians SET rating_rata2 = ? WHERE id_tech = ?',
      [avg, order.id_tech]
    );

    res.json({ message: 'Rating berhasil dikirimkan.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrders, getOrderById, assignTechnician, updateStatus, submitRating };
