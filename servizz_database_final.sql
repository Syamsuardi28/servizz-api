-- ============================================================
-- DATABASE: SERVIZZ (Versi Final Tersinkronisasi dengan API)
-- ============================================================

-- (Tanpa CREATE DATABASE agar langsung masuk ke database Aiven defaultdb)

-- 1. Tabel users (Ditambah foto_profil dan is_active)
CREATE TABLE IF NOT EXISTS users (
    id_user     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama        VARCHAR(100)    NOT NULL,
    email       VARCHAR(150)    NOT NULL UNIQUE,
    no_hp       VARCHAR(20)     NOT NULL,
    alamat      TEXT            NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role        ENUM('Pelanggan', 'Mitra', 'Admin') NOT NULL DEFAULT 'Pelanggan',
    foto_profil VARCHAR(255)    DEFAULT NULL,
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_user)
) ENGINE=InnoDB;

-- 2. Tabel technicians
CREATE TABLE IF NOT EXISTS technicians (
    id_tech             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_user             INT UNSIGNED    NOT NULL,
    foto_skck           VARCHAR(255)    DEFAULT NULL,
    sertifikat_url      VARCHAR(255)    DEFAULT NULL,
    keahlian            VARCHAR(255)    NOT NULL,
    rating_rata2        DECIMAL(3, 2)   NOT NULL DEFAULT 0.00,
    status_verifikasi   ENUM('Pending', 'Terverifikasi', 'Ditolak') NOT NULL DEFAULT 'Pending',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tech),
    UNIQUE KEY uq_technicians_id_user (id_user),
    CONSTRAINT fk_technicians_user FOREIGN KEY (id_user) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Tabel services
CREATE TABLE IF NOT EXISTS services (
    id_service      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama_service    VARCHAR(100)    NOT NULL,
    deskripsi       TEXT            DEFAULT NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_service)
) ENGINE=InnoDB;

-- 4. Tabel orders (Menggunakan struktur lengkap dengan metode_pembayaran, lat, long)
CREATE TABLE IF NOT EXISTS orders (
    id_order        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_user         INT UNSIGNED    NOT NULL,
    id_tech         INT UNSIGNED    DEFAULT NULL,
    id_service      INT UNSIGNED    NOT NULL,
    tgl_kunjungan   DATETIME        NOT NULL,
    status_order    ENUM('Menunggu', 'Dikonfirmasi', 'Teknisi Berangkat', 'Sedang Dikerjakan', 'Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Menunggu',
    biaya_kunjungan DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    metode_pembayaran ENUM('Transfer Bank', 'E-Wallet', 'Tunai / Cash') NOT NULL DEFAULT 'Transfer Bank',
    latitude        DECIMAL(10, 8)  DEFAULT NULL,
    longitude       DECIMAL(11, 8)  DEFAULT NULL,
    catatan         TEXT            DEFAULT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_order),
    CONSTRAINT fk_orders_user FOREIGN KEY (id_user) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_tech FOREIGN KEY (id_tech) REFERENCES technicians (id_tech) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_orders_service FOREIGN KEY (id_service) REFERENCES services (id_service) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Tabel negotiations
CREATE TABLE IF NOT EXISTS negotiations (
    id_nego                 INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_order                INT UNSIGNED    NOT NULL,
    deskripsi_kerusakan     TEXT            NOT NULL,
    rincian_barang          TEXT            DEFAULT NULL,
    harga_barang            DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    biaya_jasa              DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    total_biaya             DECIMAL(12, 2)  GENERATED ALWAYS AS (harga_barang + biaya_jasa) STORED,
    status_acc              ENUM('Menunggu Persetujuan', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu Persetujuan',
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_nego),
    UNIQUE KEY uq_negotiations_id_order (id_order),
    CONSTRAINT fk_negotiations_order FOREIGN KEY (id_order) REFERENCES orders (id_order) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Tabel evidence
CREATE TABLE IF NOT EXISTS evidence (
    id_evidence         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_nego             INT UNSIGNED    NOT NULL,
    foto_kerusakan      VARCHAR(255)    DEFAULT NULL,
    foto_nota           VARCHAR(255)    DEFAULT NULL,
    deskripsi           TEXT            DEFAULT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_evidence),
    CONSTRAINT fk_evidence_nego FOREIGN KEY (id_nego) REFERENCES negotiations (id_nego) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Tabel ratings (Ditambahkan)
CREATE TABLE IF NOT EXISTS ratings (
    id_rating       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_order        INT UNSIGNED    NOT NULL,
    id_tech         INT UNSIGNED    NOT NULL,
    id_pelanggan    INT UNSIGNED    NOT NULL,
    nilai           INT             NOT NULL DEFAULT 5,
    komentar        TEXT            DEFAULT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_rating),
    CONSTRAINT fk_ratings_order FOREIGN KEY (id_order) REFERENCES orders (id_order) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ratings_tech FOREIGN KEY (id_tech) REFERENCES technicians (id_tech) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_ratings_user FOREIGN KEY (id_pelanggan) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Tabel notifications (Ditambahkan)
CREATE TABLE IF NOT EXISTS notifications (
    id_notif        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_user         INT UNSIGNED    NOT NULL,
    judul           VARCHAR(255)    NOT NULL,
    pesan           TEXT            NOT NULL,
    is_read         TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notif),
    CONSTRAINT fk_notif_user FOREIGN KEY (id_user) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Tabel messages (Ditambahkan)
CREATE TABLE IF NOT EXISTS messages (
    id_message      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    sender_id       INT UNSIGNED    NOT NULL,
    receiver_id     INT UNSIGNED    NOT NULL,
    content         TEXT            NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_message),
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users (id_user) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- DATA AWAL (SEED): Kategori Layanan
-- ============================================================
INSERT IGNORE INTO services (id_service, nama_service, deskripsi) VALUES
    (1, 'AC',       'Pemasangan, perbaikan, dan perawatan unit AC'),
    (2, 'Listrik',  'Instalasi dan perbaikan kelistrikan rumah/gedung'),
    (3, 'Pipa',     'Perbaikan dan instalasi pipa air dan sanitasi'),
    (4, 'Las',      'Pengelasan konstruksi besi dan aluminium'),
    (5, 'Elektronik','Perbaikan perangkat elektronik rumah tangga');
