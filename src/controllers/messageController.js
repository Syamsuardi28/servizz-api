const db = require('../config/db');

/**
 * Mendapatkan riwayat pesan antara pengguna yang login dan Admin (atau pengguna lain)
 */
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id_user; // Pengguna yang sedang login
    const targetId = req.query.target_id || 1; // Default ke ID 1 (Admin pertama)

    const [rows] = await db.query(
      `SELECT m.id_message, m.sender_id, m.receiver_id, m.content, m.created_at,
              s.nama AS sender_name, r.nama AS receiver_name
       FROM messages m
       JOIN users s ON s.id_user = m.sender_id
       JOIN users r ON r.id_user = m.receiver_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, targetId, targetId, userId]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mengirim pesan baru
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id_user;
    const { receiver_id, content } = req.body;
    
    // Default kirim ke Admin ID 1 jika tidak ada target
    const targetId = receiver_id || 1;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Isi pesan tidak boleh kosong' });
    }

    const [result] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
      [senderId, targetId, content]
    );

    // Ambil pesan yang baru disimpan untuk dikembalikan
    const [newMessage] = await db.query(
      `SELECT m.id_message, m.sender_id, m.receiver_id, m.content, m.created_at
       FROM messages m WHERE m.id_message = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: newMessage[0]
    });
  } catch (error) {
    next(error);
  }
};
