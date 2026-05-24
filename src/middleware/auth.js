const jwt = require('jsonwebtoken');

/**
 * Middleware: verifikasi JWT dari header Authorization.
 * Menyimpan payload ke req.user setelah berhasil.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token autentikasi tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id_user, role, email }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token telah kadaluarsa, silakan login ulang.' });
    }
    return res.status(401).json({ message: 'Token tidak valid.' });
  }
};

/**
 * Middleware factory: batasi akses berdasarkan role.
 * @param  {...string} roles - Role yang diizinkan, misal: 'Pelanggan', 'Mitra', 'Admin'
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Akses ditolak. Hanya untuk: ${roles.join(', ')}.`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
