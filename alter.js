require('dotenv').config();
const { query } = require('./src/config/db');

(async () => {
  try {
    console.log('Creating notifications table...');
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id_notif INT UNSIGNED NOT NULL AUTO_INCREMENT,
        id_user INT UNSIGNED NOT NULL COMMENT 'Penerima Notifikasi (Admin dll)',
        judul VARCHAR(255) NOT NULL,
        pesan TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_notif),
        CONSTRAINT fk_notif_user
          FOREIGN KEY (id_user) REFERENCES users (id_user)
          ON UPDATE CASCADE ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('Success!');
  } catch(err) {
    console.error('Error:', err);
  }
  process.exit(0);
})();
