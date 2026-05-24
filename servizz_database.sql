-- ============================================================
-- DATABASE: SERVIZZ
-- Deskripsi: Skema database untuk aplikasi layanan jasa SERVIZZ
-- Dibuat berdasarkan dokumen E-Bisnis Kelompok 1
-- ============================================================

CREATE DATABASE IF NOT EXISTS servizz_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE servizz_db;

-- ============================================================
-- TABEL 1: users
-- Menyimpan data dasar akun Pelanggan dan Mitra
-- ============================================================
CREATE TABLE users (
    id_user     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama        VARCHAR(100)    NOT NULL,
    email       VARCHAR(150)    NOT NULL UNIQUE,
    no_hp       VARCHAR(20)     NOT NULL,
    alamat      TEXT            NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role        ENUM('Pelanggan', 'Mitra', 'Admin') NOT NULL DEFAULT 'Pelanggan',
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_user)
) ENGINE=InnoDB;

-- ============================================================
-- TABEL 2: technicians
-- Menyimpan data profesional tambahan khusus untuk pengguna
-- dengan role Mitra (relasi 1:1 dengan users)
-- ============================================================
CREATE TABLE technicians (
    id_tech             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_user             INT UNSIGNED    NOT NULL,
    foto_skck           VARCHAR(255)    DEFAULT NULL COMMENT 'Path/URL file foto SKCK',
    sertifikat_url      VARCHAR(255)    DEFAULT NULL COMMENT 'Path/URL file sertifikat keahlian',
    keahlian            VARCHAR(255)    NOT NULL COMMENT 'Daftar keahlian, misal: AC, Listrik, Pipa',
    rating_rata2        DECIMAL(3, 2)   NOT NULL DEFAULT 0.00 COMMENT 'Rata-rata rating dari pelanggan (0.00 - 5.00)',
    status_verifikasi   ENUM('Pending', 'Terverifikasi', 'Ditolak') NOT NULL DEFAULT 'Pending',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tech),
    UNIQUE KEY uq_technicians_id_user (id_user),           -- Enforce relasi 1:1
    CONSTRAINT fk_technicians_user
        FOREIGN KEY (id_user) REFERENCES users (id_user)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABEL 3: services
-- Daftar kategori jasa yang tersedia (AC, Listrik, Pipa, dll)
-- ============================================================
CREATE TABLE services (
    id_service      INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nama_service    VARCHAR(100)    NOT NULL,
    deskripsi       TEXT            DEFAULT NULL,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_service)
) ENGINE=InnoDB;

-- ============================================================
-- TABEL 4: orders
-- Tabel inti yang mencatat setiap permintaan jasa (transaksi awal)
-- Dibuat saat pelanggan pertama kali memesan
-- ============================================================
CREATE TABLE orders (
    id_order        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_user         INT UNSIGNED    NOT NULL  COMMENT 'FK ke pelanggan (users)',
    id_tech         INT UNSIGNED    DEFAULT NULL COMMENT 'FK ke mitra/teknisi (technicians)',
    id_service      INT UNSIGNED    NOT NULL  COMMENT 'FK ke jenis layanan (services)',
    tgl_kunjungan   DATETIME        NOT NULL,
    status_order    ENUM(
                        'Menunggu',
                        'Dikonfirmasi',
                        'Teknisi Berangkat',
                        'Sedang Dikerjakan',
                        'Selesai',
                        'Dibatalkan'
                    ) NOT NULL DEFAULT 'Menunggu',
    biaya_kunjungan DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Fixed fee biaya kunjungan awal',
    metode_pembayaran ENUM('Transfer Bank', 'E-Wallet', 'Tunai / Cash') NOT NULL DEFAULT 'Transfer Bank',
    latitude        DECIMAL(10, 8)  DEFAULT NULL,
    longitude       DECIMAL(11, 8)  DEFAULT NULL,
    catatan         TEXT            DEFAULT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_order),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (id_user)    REFERENCES users (id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_tech
        FOREIGN KEY (id_tech)    REFERENCES technicians (id_tech)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_orders_service
        FOREIGN KEY (id_service) REFERENCES services (id_service)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- TABEL 5: negotiations
-- Inti dari fitur "Digital Lock" — mengunci harga jasa setelah
-- diagnosa di lokasi. Terisi setelah teknisi tiba di lokasi.
-- (relasi 1:1 dengan orders)
-- ============================================================
CREATE TABLE negotiations (
    id_nego                 INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_order                INT UNSIGNED    NOT NULL,
    deskripsi_kerusakan     TEXT            NOT NULL COMMENT 'Diagnosa kerusakan oleh teknisi',
    rincian_barang          TEXT            DEFAULT NULL COMMENT 'Rincian barang yang dibutuhkan',
    harga_barang            DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    biaya_jasa              DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    total_biaya             DECIMAL(12, 2)  GENERATED ALWAYS AS (harga_barang + biaya_jasa) STORED
                                            COMMENT 'Total otomatis: harga_barang + biaya_jasa',
    status_acc              ENUM('Menunggu Persetujuan', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu Persetujuan'
                                            COMMENT 'Status Digital Lock dari pelanggan',
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_nego),
    UNIQUE KEY uq_negotiations_id_order (id_order),       -- Enforce relasi 1:1 dengan orders
    CONSTRAINT fk_negotiations_order
        FOREIGN KEY (id_order) REFERENCES orders (id_order)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TABEL 6: evidence
-- Menyimpan bukti fisik: foto kerusakan & nota belanja
-- sebagai dasar validasi (relasi 1:N dengan negotiations)
-- ============================================================
CREATE TABLE evidence (
    id_evidence         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    id_nego             INT UNSIGNED    NOT NULL,
    foto_kerusakan      VARCHAR(255)    DEFAULT NULL COMMENT 'Path/URL foto kondisi kerusakan',
    foto_nota           VARCHAR(255)    DEFAULT NULL COMMENT 'Path/URL foto nota/struk belanja barang',
    deskripsi           TEXT            DEFAULT NULL COMMENT 'Keterangan tambahan bukti',
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_evidence),
    CONSTRAINT fk_evidence_nego
        FOREIGN KEY (id_nego) REFERENCES negotiations (id_nego)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- DATA AWAL (SEED): Kategori Layanan
-- ============================================================
INSERT INTO services (nama_service, deskripsi) VALUES
    ('AC',       'Pemasangan, perbaikan, dan perawatan unit AC'),
    ('Listrik',  'Instalasi dan perbaikan kelistrikan rumah/gedung'),
    ('Pipa',     'Perbaikan dan instalasi pipa air dan sanitasi'),
    ('Las',      'Pengelasan konstruksi besi dan aluminium'),
    ('Elektronik','Perbaikan perangkat elektronik rumah tangga');


-- ============================================================
-- RINGKASAN RELASI
-- users          1 ──── 1  technicians
-- users          1 ──── N  orders         (sebagai Pelanggan)
-- technicians    1 ──── N  orders         (sebagai Mitra)
-- services       1 ──── N  orders
-- orders         1 ──── 1  negotiations
-- negotiations   1 ──── N  evidence
-- ============================================================
