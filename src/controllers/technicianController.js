const { query } = require('../config/db');

/**
 * GET /technicians
 * Ambil daftar teknisi dengan optional filter status verifikasi
 */
exports.getAll = async (req, res, next) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        t.id_tech,
        u.id_user,
        u.nama,
        u.email,
        u.no_hp,
        u.alamat,
        u.role,
        t.foto_skck,
        t.sertifikat_url,
        t.keahlian,
        t.rating_rata2,
        t.status_verifikasi,
        t.created_at
      FROM technicians t
      INNER JOIN users u ON t.id_user = u.id_user
      WHERE u.role = 'Mitra'
    `;

    const params = [];

    // Filter berdasarkan status verifikasi jika diberikan
    if (status && ['Pending', 'Terverifikasi', 'Ditolak'].includes(status)) {
      sql += ` AND t.status_verifikasi = ?`;
      params.push(status);
    }

    sql += ` ORDER BY t.created_at DESC`;

    const technicians = await query(sql, params);

    return res.json({
      success: true,
      data: {
        technicians: technicians,
        total: technicians.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /technicians/:id
 * Ambil detail teknisi berdasarkan id_tech
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        t.id_tech,
        u.id_user,
        u.nama,
        u.email,
        u.no_hp,
        u.alamat,
        u.role,
        t.foto_skck,
        t.sertifikat_url,
        t.keahlian,
        t.rating_rata2,
        t.status_verifikasi,
        t.created_at,
        t.updated_at
      FROM technicians t
      INNER JOIN users u ON t.id_user = u.id_user
      WHERE t.id_tech = ? AND u.role = 'Mitra'
      LIMIT 1
    `;

    const technicians = await query(sql, [id]);

    if (technicians.length === 0) {
      return res.status(404).json({
        success: false,
        data: { message: 'Teknisi tidak ditemukan.' },
      });
    }

    return res.json({
      success: true,
      data: {
        technician: technicians[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /technicians/:id/verify
 * Verifikasi atau tolak teknisi (hanya Admin)
 */
exports.verify = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, catatan_admin } = req.body;

    // Validasi status
    if (!['Terverifikasi', 'Ditolak'].includes(status)) {
      return res.status(400).json({
        success: false,
        data: { message: 'Status harus "Terverifikasi" atau "Ditolak".' },
      });
    }

    // Cek apakah teknisi ada
    const checkQuery = 'SELECT id_tech FROM technicians WHERE id_tech = ? LIMIT 1';
    const check = await query(checkQuery, [id]);

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        data: { message: 'Teknisi tidak ditemukan.' },
      });
    }

    // Update status verifikasi
    const updateQuery = `
      UPDATE technicians 
      SET status_verifikasi = ?, updated_at = NOW()
      WHERE id_tech = ?
    `;

    await query(updateQuery, [status, id]);

    return res.json({
      success: true,
      data: { message: `Teknisi berhasil di-${status}.` },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /technicians/:id/rating
 * Ambil rating dan review untuk teknisi tertentu
 */
exports.getRating = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cek apakah teknisi ada
    const checkQuery = 'SELECT id_tech FROM technicians WHERE id_tech = ? LIMIT 1';
    const check = await query(checkQuery, [id]);

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        data: { message: 'Teknisi tidak ditemukan.' },
      });
    }

    // Ambil semua review/rating
    const reviews = await query(
      `SELECT r.id_rating, r.nilai, r.komentar, r.created_at, u.nama AS nama_pelanggan
       FROM ratings r
       JOIN users u ON u.id_user = r.id_pelanggan
       WHERE r.id_tech = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const totalReview = reviews.length;
    let rata2 = 0;
    if (totalReview > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.nilai, 0);
      rata2 = sum / totalReview;
    }

    return res.json({
      success: true,
      data: {
        id_tech: id,
        rating_rata2: rata2,
        total_rating: totalReview,
        ratings: reviews,
      },
    });
  } catch (err) {
    next(err);
  }
};
