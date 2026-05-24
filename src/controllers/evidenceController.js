const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /evidence
 * Mitra menambahkan bukti foto kerusakan / nota belanja.
 * Body: { nego_id, foto_kerusakan?, foto_nota?, deskripsi? }
 */
const addEvidence = async (req, res, next) => {
  try {
    const { nego_id, foto_kerusakan, foto_nota, deskripsi } = req.body;
    const id_user = req.user.id_user;

    const techRows = await query('SELECT id_tech FROM technicians WHERE id_user = ?', [id_user]);
    if (techRows.length === 0) throw createError(404, 'Data teknisi tidak ditemukan.');
    const id_tech = techRows[0].id_tech;

    // Pastikan nego_id terkait order yang ditangani mitra ini
    const negoCheck = await query(
      `SELECT n.id_nego FROM negotiations n
       JOIN orders o ON o.id_order = n.id_order
       WHERE n.id_nego = ? AND o.id_tech = ?`,
      [nego_id, id_tech]
    );
    if (negoCheck.length === 0) throw createError(403, 'Negosiasi tidak ditemukan atau bukan milik Anda.');

    const result = await query(
      `INSERT INTO evidence (id_nego, foto_kerusakan, foto_nota, deskripsi)
       VALUES (?, ?, ?, ?)`,
      [nego_id, foto_kerusakan || null, foto_nota || null, deskripsi || null]
    );

    res.status(201).json({
      message:     'Bukti berhasil ditambahkan.',
      id_evidence: result.insertId,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /evidence/:nego_id
 * Lihat semua evidence untuk satu negosiasi.
 */
const getByNegoId = async (req, res, next) => {
  try {
    const { nego_id } = req.params;
    const rows = await query(
      'SELECT * FROM evidence WHERE id_nego = ? ORDER BY created_at ASC',
      [nego_id]
    );
    res.json({ evidence: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { addEvidence, getByNegoId };
