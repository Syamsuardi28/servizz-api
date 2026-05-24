const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+07:00',
});

/**
 * Helper query sederhana.
 * Mengembalikan [rows, fields].
 */
const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Helper transaksi atomic.
 * @param {Function} callback - async (conn) => { ... return result }
 */
const withTransaction = async (callback) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { pool, query, withTransaction };
