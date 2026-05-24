const { query } = require('./src/config/db');

async function checkUsers() {
  try {
    const allUsers = await query("SELECT * FROM users");
    console.log("ALL USERS:", allUsers);
  } catch(e) {
    console.error(e);
  }
}
checkUsers();
