const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

/** GET /services - Daftar semua layanan aktif */
const getAll = async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT id_service, nama_service, deskripsi, is_active FROM services ORDER BY nama_service'
    );
    res.json({ services: rows });
  } catch (err) {
    next(err);
  }
};

/** POST /services - Admin menambah kategori baru. Body: { nama_service, deskripsi?, is_active? } */
const create = async (req, res, next) => {
  try {
    const { nama_service, deskripsi, is_active } = req.body;
    
    // Tentukan nilai is_active: default ke 1 jika tidak didefinisikan
    const activeValue = (is_active !== undefined && is_active !== null) 
      ? (is_active === true || is_active === 1 || is_active === '1' ? 1 : 0) 
      : 1;

    const result = await query(
      'INSERT INTO services (nama_service, deskripsi, is_active) VALUES (?, ?, ?)',
      [nama_service, deskripsi || null, activeValue]
    );
    res.status(201).json({
      message: 'Kategori jasa berhasil ditambahkan.',
      service: { id_service: result.insertId, nama_service, deskripsi, is_active: activeValue },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create };
