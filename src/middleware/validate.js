/**
 * Middleware factory: validasi field wajib ada di req.body.
 * @param {string[]} requiredFields
 */
const requireFields = (requiredFields) => (req, res, next) => {
  const missing = requiredFields.filter(
    (field) => req.body[field] === undefined || req.body[field] === ''
  );
  if (missing.length > 0) {
    return res.status(400).json({
      message: `Field berikut wajib diisi: ${missing.join(', ')}.`,
    });
  }
  next();
};

module.exports = { requireFields };
