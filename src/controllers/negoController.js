const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /nego/create
 * Mitra membuat entri negosiasi pertama kali setelah diagnosa.
 * Body: { order_id, deskripsi_kerusakan, rincian_barang?, harga_barang, biaya_jasa }
 */
const createNegotiation = async (req, res, next) => {
  try {
    const { order_id, deskripsi_kerusakan, rincian_barang, harga_barang, biaya_jasa } = req.body;
    const id_user = req.user.id_user;

    const techRows = await query('SELECT id_tech FROM technicians WHERE id_user = ?', [id_user]);
    if (techRows.length === 0) throw createError(404, 'Data teknisi tidak ditemukan.');
    const id_tech = techRows[0].id_tech;

    const orderCheck = await query(
      `SELECT id_order FROM orders
       WHERE id_order = ? AND id_tech = ?
         AND status_order IN ('Dikonfirmasi', 'Teknisi Berangkat', 'Sedang Dikerjakan')`,
      [order_id, id_tech]
    );
    if (orderCheck.length === 0) throw createError(403, 'Pesanan tidak ditemukan atau bukan milik Anda.');

    const negoExists = await query('SELECT id_nego FROM negotiations WHERE id_order = ?', [order_id]);
    if (negoExists.length > 0) throw createError(409, 'Negosiasi sudah ada. Gunakan endpoint update-price.');

    const result = await query(
      `INSERT INTO negotiations (id_order, deskripsi_kerusakan, rincian_barang, harga_barang, biaya_jasa)
       VALUES (?, ?, ?, ?, ?)`,
      [order_id, deskripsi_kerusakan, rincian_barang || null, harga_barang, biaya_jasa]
    );

    // Ambil total_biaya (generated column)
    const negoRows = await query('SELECT total_biaya, status_acc FROM negotiations WHERE id_nego = ?', [result.insertId]);

    await query(
      `UPDATE orders SET status_order = 'Sedang Dikerjakan', updated_at = NOW() WHERE id_order = ?`,
      [order_id]
    );

    res.status(201).json({
      message: 'Rincian biaya berhasil dibuat. Menunggu persetujuan pelanggan.',
      nego_id:    result.insertId,
      total_price: negoRows[0].total_biaya,
      status_acc:  negoRows[0].status_acc,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /nego/update-price
 * Mitra mengupdate rincian biaya (Digital Lock di-reset ke Menunggu).
 * Body: { order_id, item_price, service_fee, deskripsi_kerusakan?, rincian_barang? }
 */
const updatePrice = async (req, res, next) => {
  try {
    const { order_id, item_price, service_fee, deskripsi_kerusakan, rincian_barang } = req.body;
    const id_user = req.user.id_user;

    const techRows = await query('SELECT id_tech FROM technicians WHERE id_user = ?', [id_user]);
    if (techRows.length === 0) throw createError(404, 'Data teknisi tidak ditemukan.');
    const id_tech = techRows[0].id_tech;

    // Pastikan nego terkait dengan order milik mitra & belum disetujui
    const negoRows = await query(
      `SELECT n.id_nego FROM negotiations n
       JOIN orders o ON o.id_order = n.id_order
       WHERE o.id_order = ? AND o.id_tech = ? AND n.status_acc != 'Disetujui'`,
      [order_id, id_tech]
    );
    if (negoRows.length === 0) throw createError(400, 'Negosiasi tidak ditemukan, bukan milik Anda, atau sudah dikunci.');

    const id_nego = negoRows[0].id_nego;

    await query(
      `UPDATE negotiations
       SET harga_barang        = ?,
           biaya_jasa          = ?,
           deskripsi_kerusakan = COALESCE(?, deskripsi_kerusakan),
           rincian_barang      = COALESCE(?, rincian_barang),
           status_acc          = 'Menunggu Persetujuan',
           updated_at          = NOW()
       WHERE id_nego = ?`,
      [item_price, service_fee, deskripsi_kerusakan || null, rincian_barang || null, id_nego]
    );

    const updated = await query('SELECT total_biaya FROM negotiations WHERE id_nego = ?', [id_nego]);

    res.json({
      message:     'Rincian biaya berhasil diperbarui.',
      nego_id:     id_nego,
      total_price: updated[0].total_biaya,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /nego/approve
 * Pelanggan menyetujui atau menolak harga (Digital Lock).
 * Body: { nego_id, is_approved: true | false }
 */
const approveNegotiation = async (req, res, next) => {
  try {
    const { nego_id, is_approved } = req.body;
    const id_user = req.user.id_user;

    const negoRows = await query(
      `SELECT n.id_nego, n.status_acc
       FROM negotiations n
       JOIN orders o ON o.id_order = n.id_order
       WHERE n.id_nego = ? AND o.id_user = ?`,
      [nego_id, id_user]
    );
    if (negoRows.length === 0) throw createError(403, 'Negosiasi tidak ditemukan atau bukan milik Anda.');
    if (negoRows[0].status_acc === 'Disetujui') {
      return res.status(409).json({ message: 'Harga sudah dikunci sebelumnya.' });
    }

    const newStatus = is_approved ? 'Disetujui' : 'Ditolak';

    await query(
      `UPDATE negotiations SET status_acc = ?, updated_at = NOW() WHERE id_nego = ?`,
      [newStatus, nego_id]
    );

    res.json({
      message: is_approved ? 'Harga disetujui. Digital Lock aktif.' : 'Harga ditolak. Silakan negosiasi ulang.',
      status:  is_approved ? 'locked' : 'rejected',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /nego/:order_id
 * Detail negosiasi beserta list evidence-nya.
 */
const getByOrderId = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const negoRows = await query(
      `SELECT * FROM negotiations WHERE id_order = ?`,
      [order_id]
    );
    if (negoRows.length === 0) throw createError(404, 'Negosiasi untuk pesanan ini belum ada.');

    const nego = negoRows[0];

    const evidenceRows = await query(
      `SELECT id_evidence, foto_kerusakan, foto_nota, deskripsi, created_at
       FROM evidence WHERE id_nego = ? ORDER BY created_at ASC`,
      [nego.id_nego]
    );

    res.json({ negotiation: { ...nego, evidence: evidenceRows } });
  } catch (err) {
    next(err);
  }
};

module.exports = { createNegotiation, updatePrice, approveNegotiation, getByOrderId };
