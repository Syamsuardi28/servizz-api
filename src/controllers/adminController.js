const { query } = require('../config/db');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Basic Stats
    const pelangganRes = await query(`SELECT COUNT(*) as total FROM users WHERE role = 'Pelanggan'`);
    const total_pelanggan = pelangganRes[0].total;

    const mitraAktifRes = await query(`SELECT COUNT(*) as total FROM technicians WHERE status_verifikasi = 'Terverifikasi'`);
    const total_mitra_aktif = mitraAktifRes[0].total;

    const mitraPendingRes = await query(`SELECT COUNT(*) as total FROM technicians WHERE status_verifikasi = 'Pending'`);
    const mitra_pending = mitraPendingRes[0].total;

    const orderTotalRes = await query(`SELECT COUNT(*) as total FROM orders`);
    const total_order = orderTotalRes[0].total;

    const orderMenungguRes = await query(`SELECT COUNT(*) as total FROM orders WHERE status_order = 'Menunggu'`);
    const order_menunggu = orderMenungguRes[0].total;

    const orderSelesaiRes = await query(`SELECT COUNT(*) as total FROM orders WHERE status_order = 'Selesai'`);
    const order_selesai = orderSelesaiRes[0].total;

    const revenueRes = await query(`SELECT SUM(biaya_kunjungan) as total FROM orders WHERE status_order = 'Selesai'`);
    const total_revenue = revenueRes[0].total || 0;

    // 2. Chart 1: Order Trends (Bar Chart) - Grouped by Month for current year
    const orderTrends = await query(`
      SELECT 
        MONTH(created_at) as month,
        COUNT(id_order) as total_pesanan,
        SUM(CASE WHEN status_order = 'Selesai' THEN 1 ELSE 0 END) as pesanan_selesai
      FROM orders
      WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    // 3. Chart 2: Service Popularity (Doughnut Chart)
    const serviceStats = await query(`
      SELECT s.nama_service as label, COUNT(o.id_order) as value
      FROM orders o
      JOIN services s ON o.id_service = s.id_service
      GROUP BY s.id_service, s.nama_service
      ORDER BY value DESC
      LIMIT 3
    `);

    // 4. Chart 3: Customer Growth by Role
    const userGrowth = await query(`
      SELECT role as label, COUNT(id_user) as value
      FROM users
      GROUP BY role
    `);

    const recentOrders = await query(`
      SELECT o.id_order, u.nama AS nama_pelanggan, s.nama_service, o.tgl_kunjungan, o.biaya_kunjungan, o.status_order
      FROM orders o
      JOIN users u ON o.id_user = u.id_user
      JOIN services s ON o.id_service = s.id_service
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // 5. Calendar Bookings (Next 7 days)
    const calendarBookings = await query(`
      SELECT o.id_order, o.tgl_kunjungan, s.nama_service, u.nama AS nama_pelanggan 
      FROM orders o
      JOIN services s ON o.id_service = s.id_service
      JOIN users u ON o.id_user = u.id_user
      WHERE o.tgl_kunjungan >= CURRENT_DATE
      ORDER BY o.tgl_kunjungan ASC
      LIMIT 10
    `);

    // 6. Tasks (Pending Technicians)
    const pendingTasks = await query(`
      SELECT t.id_tech, u.nama, t.created_at
      FROM technicians t
      JOIN users u ON t.id_user = u.id_user
      WHERE t.status_verifikasi = 'Pending'
      ORDER BY t.created_at DESC
      LIMIT 5
    `);

    // 7. Top Partners (Revenue overview bars)
    const topPartners = await query(`
      SELECT u.nama, SUM(o.biaya_kunjungan) as total_revenue
      FROM orders o
      JOIN technicians t ON o.id_tech = t.id_tech
      JOIN users u ON t.id_user = u.id_user
      WHERE o.status_order = 'Selesai'
      GROUP BY t.id_tech, u.nama
      ORDER BY total_revenue DESC
      LIMIT 4
    `);

    res.json({
      success: true,
      data: {
        stats: {
          total_pelanggan,
          total_mitra_aktif,
          mitra_pending,
          total_order,
          order_menunggu,
          order_selesai,
          total_revenue
        },
        charts: {
          orderTrends,
          serviceStats,
          userGrowth
        },
        calendarBookings,
        pendingTasks,
        topPartners,
        recent_orders: recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    let sqlQuery = `SELECT id_user, nama, email, no_hp, alamat, role, is_active, created_at FROM users`;
    const params = [];

    if (role && ['Admin', 'Pelanggan', 'Mitra'].includes(role)) {
      sqlQuery += ` WHERE role = ?`;
      params.push(role);
    }
    
    sqlQuery += ` ORDER BY created_at DESC`;

    const users = await query(sqlQuery, params);

    res.json({
      success: true,
      data: {
        users: users
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const check = await query(`SELECT is_active FROM users WHERE id_user = ? LIMIT 1`, [id]);
    if (check.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const newStatus = check[0].is_active === 1 ? 0 : 1;
    await query(`UPDATE users SET is_active = ?, updated_at = NOW() WHERE id_user = ?`, [newStatus, id]);

    res.json({
      success: true,
      data: { message: `Status user berhasil diubah.` }
    });
  } catch (err) {
    next(err);
  }
};
