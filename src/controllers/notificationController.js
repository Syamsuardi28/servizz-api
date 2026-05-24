const { query } = require('../config/db');

/**
 * GET /notifications
 * Ambil notifikasi milik user yang sedang login
 */
const getNotifications = async (req, res, next) => {
  try {
    const { id_user } = req.user;
    const limit = parseInt(req.query.limit) || 20;

    const rows = await query(
      `SELECT id_notif, judul, pesan, is_read, created_at 
       FROM notifications 
       WHERE id_user = ? 
       ORDER BY created_at DESC 
       LIMIT ${Number(limit)}`,
      [id_user]
    );

    res.json({ notifications: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /notifications/:id/read
 * Tandai notifikasi sebagai sudah dibaca
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_user } = req.user;

    await query(
      `UPDATE notifications SET is_read = 1 WHERE id_notif = ? AND id_user = ?`,
      [id, id_user]
    );

    res.json({ message: 'Notifikasi ditandai sudah dibaca' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /notifications/help
 * Pelanggan/Mitra mengirim pesan bantuan, notifikasi dikirim ke Admin
 */
const submitHelp = async (req, res, next) => {
  try {
    const { judul, pesan } = req.body;
    const { id_user, role } = req.user;

    if (!judul || !pesan) {
      return res.status(400).json({ message: 'Judul dan pesan wajib diisi.' });
    }

    // Ambil nama user pengirim
    const sender = await query(`SELECT nama FROM users WHERE id_user = ?`, [id_user]);
    const nama = sender.length > 0 ? sender[0].nama : 'User';

    // Cari ID Admin (Bisa 1 atau lebih, kita kirim ke semua Admin)
    const admins = await query(`SELECT id_user FROM users WHERE role = 'Admin'`);
    if (admins.length === 0) {
      return res.status(404).json({ message: 'Tidak ada Admin yang tersedia saat ini.' });
    }

    const notifJudul = `Bantuan (${role} - ${nama}): ${judul}`;
    const notifPesan = pesan;

    for (const admin of admins) {
      await query(
        `INSERT INTO notifications (id_user, judul, pesan) VALUES (?, ?, ?)`,
        [admin.id_user, notifJudul, notifPesan]
      );
    }

    res.status(201).json({ message: 'Pesan bantuan berhasil dikirimkan ke Admin.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, submitHelp };
