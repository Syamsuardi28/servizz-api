const { query } = require('./src/config/db');

async function test() {
  try {
    const res = await query(`
      SELECT 
        t.id_tech,
        u.id_user,
        u.nama,
        u.email,
        t.status_verifikasi
      FROM technicians t
      INNER JOIN users u ON t.id_user = u.id_user
      WHERE u.role = 'Mitra'
    `);
    console.log("JOIN RESULT:", res);

    const users = await query("SELECT id_user, nama, role FROM users WHERE role = 'Mitra'");
    console.log("MITRA USERS:", users);

    const techs = await query("SELECT id_tech, id_user, status_verifikasi FROM technicians");
    console.log("ALL TECHS:", techs);

  } catch(e) {
    console.error(e);
  }
}
test();
