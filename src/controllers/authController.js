const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * POST /auth/register
 * Body: { nama, email, password, no_hp, alamat, role }
 */
const register = async (req, res, next) => {
  try {
    const { nama, email, password, no_hp, alamat, role = 'Pelanggan' } = req.body;

    const validRoles = ['Pelanggan', 'Mitra'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Role tidak valid. Pilih: ${validRoles.join(', ')}.` });
    }

    const existing = await query('SELECT id_user FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (nama, email, password_hash, no_hp, alamat, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nama, email, hashedPassword, no_hp, alamat, role]
    );

    const id_user = result.insertId;

    if (role === 'Mitra') {
      await query(
        `INSERT INTO technicians (id_user, keahlian) VALUES (?, '')`,
        [id_user]
      );
    }

    res.status(201).json({
      message: 'Registrasi berhasil.',
      user: { id_user, nama, email, role },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 * Body: { email, password }
 * Response: { token, user_role }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const rows = await query(
      'SELECT id_user, nama, email, password_hash, role, foto_profil FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const payload = { id_user: user.id_user, email: user.email, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      message: 'Login berhasil.',
      token,
      user_role: user.role,
      user: { id_user: user.id_user, nama: user.nama, email: user.email, foto_profil: user.foto_profil },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT u.id_user, u.nama, u.email, u.no_hp, u.alamat, u.role, u.foto_profil, u.created_at, 
              t.keahlian, t.foto_skck, t.sertifikat_url, t.status_verifikasi
       FROM users u 
       LEFT JOIN technicians t ON u.id_user = t.id_user 
       WHERE u.id_user = ?`,
      [req.user.id_user]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /auth/me
 */
const updateMe = async (req, res, next) => {
  try {
    const { nama, no_hp, alamat, keahlian } = req.body;
    const { id_user, role } = req.user;

    // Update users table
    await query(
      'UPDATE users SET nama = ?, no_hp = ?, alamat = ? WHERE id_user = ?',
      [nama, no_hp, alamat, id_user]
    );

    // If role is Mitra, update technicians table
    if (role === 'Mitra' && keahlian !== undefined) {
      await query(
        'UPDATE technicians SET keahlian = ? WHERE id_user = ?',
        [keahlian, id_user]
      );
    }

    res.json({ message: 'Profil berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/avatar
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file gambar yang diunggah.' });
    }

    const { id_user } = req.user;
    const fileName = req.file.filename;

    await query(
      'UPDATE users SET foto_profil = ? WHERE id_user = ?',
      [fileName, id_user]
    );

    res.json({ 
      message: 'Foto profil berhasil diperbarui.',
      foto_profil: fileName
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /auth/avatar
 */
const deleteAvatar = async (req, res, next) => {
  try {
    const { id_user } = req.user;
    
    // Optional: get current avatar and delete file from disk
    const rows = await query('SELECT foto_profil FROM users WHERE id_user = ?', [id_user]);
    if (rows.length > 0 && rows[0].foto_profil) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../public/uploads/avatars', rows[0].foto_profil);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query(
      'UPDATE users SET foto_profil = NULL WHERE id_user = ?',
      [id_user]
    );

    res.json({ message: 'Foto profil berhasil dihapus.', foto_profil: null });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /auth/password
 * Body: { current_password, new_password }
 */
const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const { id_user } = req.user;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Password saat ini dan password baru wajib diisi.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
    }

    const rows = await query('SELECT password_hash FROM users WHERE id_user = ?', [id_user]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Password saat ini salah.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = ? WHERE id_user = ?', [hashedPassword, id_user]);

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/documents
 * Mengunggah SKCK dan Sertifikat untuk Mitra
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const { id_user, role } = req.user;
    
    if (role !== 'Mitra') {
      return res.status(403).json({ message: 'Hanya Mitra yang dapat mengunggah dokumen.' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'Tidak ada dokumen yang diunggah.' });
    }

    const updates = [];
    const params = [];

    if (req.files.foto_skck) {
      const baseUrl = process.env.SERVIZZ_API_URL || 'http://localhost:3000';
      const skckUrl = baseUrl + '/uploads/documents/' + req.files.foto_skck[0].filename;
      updates.push('foto_skck = ?');
      params.push(skckUrl);
    }

    if (req.files.sertifikat) {
      const baseUrl = process.env.SERVIZZ_API_URL || 'http://localhost:3000';
      const sertifikatUrl = baseUrl + '/uploads/documents/' + req.files.sertifikat[0].filename;
      updates.push('sertifikat_url = ?');
      params.push(sertifikatUrl);
    }

    if (updates.length > 0) {
      updates.push('status_verifikasi = ?');
      params.push('Pending'); // Reset status verifikasi ke Pending setelah unggah dokumen baru
      
      params.push(id_user);
      await query(
        `UPDATE technicians SET ${updates.join(', ')} WHERE id_user = ?`,
        params
      );
    }

    res.json({ message: 'Dokumen berhasil diunggah dan sedang ditinjau.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe, uploadAvatar, deleteAvatar, updatePassword, uploadDocuments };
