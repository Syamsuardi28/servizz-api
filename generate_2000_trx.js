require('dotenv').config();
const { pool, query } = require('./src/config/db');
const fs = require('fs');

async function generate() {
    try {
        console.log("Generating 2000 COMPLETE transactions...");

        // Safely clear old dummy data
        console.log("Clearing old dummy data...");
        await pool.query("DELETE FROM orders WHERE catatan = 'Order otomatis'");

        // Ensure at least 1 customer
        let customers = await query("SELECT id_user FROM users WHERE role = 'Pelanggan'");
        if (customers.length === 0) {
            await pool.query("INSERT INTO users (nama, email, no_hp, alamat, password_hash, role) VALUES ('Pelanggan Test', 'pelanggan@test.com', '08123456789', 'Alamat Test', 'hash', 'Pelanggan')");
            customers = await query("SELECT id_user FROM users WHERE role = 'Pelanggan'");
        }
        const customerIds = customers.map(c => c.id_user);

        // Ensure at least 1 technician
        let techs = await query("SELECT id_tech, id_user FROM technicians");
        if (techs.length === 0) {
            await pool.query("INSERT INTO users (nama, email, no_hp, alamat, password_hash, role) VALUES ('Mitra Test', 'mitra@test.com', '08123456780', 'Alamat Mitra', 'hash', 'Mitra')");
            const newMitra = await query("SELECT id_user FROM users WHERE email = 'mitra@test.com'");
            await pool.query("INSERT INTO technicians (id_user, keahlian, status_verifikasi) VALUES (?, 'AC', 'Terverifikasi')", [newMitra[0].id_user]);
            techs = await query("SELECT id_tech, id_user FROM technicians");
        }

        // Ensure at least 1 service
        let services = await query("SELECT id_service FROM services");
        if (services.length === 0) {
            await pool.query("INSERT INTO services (nama_service) VALUES ('AC')");
            services = await query("SELECT id_service FROM services");
        }
        const serviceIds = services.map(s => s.id_service);

        let csvData = "id_order,id_user,id_tech,id_service,tgl_kunjungan,status_order,biaya_kunjungan,harga_barang,biaya_jasa,total_biaya,foto_kerusakan,foto_nota,rating_nilai,rating_komentar\n";
        
        console.log("Inserting 2000 orders into database with evidence and ratings...");
        
        const generateRandomDate = () => {
            const start = new Date(2025, 0, 1).getTime();
            const end = new Date(2026, 5, 1).getTime();
            const randomTime = new Date(start + Math.random() * (end - start));
            return randomTime.toISOString().slice(0, 19).replace('T', ' ');
        };

        const comments = [
            "Pekerjaan sangat rapi dan teknisi ramah.",
            "Teknisi datang tepat waktu, masalah cepat selesai.",
            "Harga sesuai dengan kualitas. Sangat memuaskan.",
            "Sedikit terlambat tapi hasil kerjanya bagus.",
            "Lumayan, AC sudah dingin kembali.",
            "Sangat profesional dan cepat tanggap.",
            "Luar biasa, sparepart diganti dengan yang ori.",
            "Kerja cepat dan bersih."
        ];

        const batchSize = 100;
        
        for (let b = 0; b < 2000 / batchSize; b++) {
            let insertOrderValues = [];
            let ordersData = [];
            
            for (let i = 0; i < batchSize; i++) {
                const id_user = customerIds[Math.floor(Math.random() * customerIds.length)];
                const techObj = techs[Math.floor(Math.random() * techs.length)];
                const id_tech = techObj.id_tech;
                const id_service = serviceIds[Math.floor(Math.random() * serviceIds.length)];
                const tgl_kunjungan = generateRandomDate();
                const biaya_kunjungan = 50000;
                
                insertOrderValues.push([id_user, id_tech, id_service, tgl_kunjungan, 'Selesai', biaya_kunjungan, 'Order otomatis']);
                
                const harga_barang = Math.floor(Math.random() * 50) * 10000; // 0 to 500,000
                const biaya_jasa = Math.floor(Math.random() * 20 + 5) * 10000; // 50,000 to 250,000
                const total_biaya = harga_barang + biaya_jasa;
                
                const nilai = Math.random() > 0.2 ? 5 : 4; // Mostly 4 and 5
                const komentar = comments[Math.floor(Math.random() * comments.length)];
                
                const foto_kerusakan = `https://picsum.photos/seed/krs${Math.random()}/300/200`;
                const foto_nota = `https://picsum.photos/seed/nt${Math.random()}/300/200`;

                ordersData.push({ id_user, id_tech, id_service, tgl_kunjungan, biaya_kunjungan, harga_barang, biaya_jasa, total_biaya, nilai, komentar, foto_kerusakan, foto_nota });
            }
            
            // Insert Orders
            const [insertResult] = await pool.query(
                "INSERT INTO orders (id_user, id_tech, id_service, tgl_kunjungan, status_order, biaya_kunjungan, catatan) VALUES ?",
                [insertOrderValues]
            );
            
            const firstInsertId = insertResult.insertId;
            
            let insertNegoValues = [];
            let insertRatingValues = [];
            
            for (let i = 0; i < batchSize; i++) {
                const id_order = firstInsertId + i;
                const d = ordersData[i];
                
                insertNegoValues.push([id_order, 'Kerusakan pada komponen', 'Penggantian suku cadang', d.harga_barang, d.biaya_jasa, 'Disetujui']);
                insertRatingValues.push([id_order, d.id_tech, d.id_user, d.nilai, d.komentar]);
                
                csvData += `${id_order},${d.id_user},${d.id_tech},${d.id_service},${d.tgl_kunjungan},Selesai,${d.biaya_kunjungan},${d.harga_barang},${d.biaya_jasa},${d.total_biaya},"${d.foto_kerusakan}","${d.foto_nota}",${d.nilai},"${d.komentar}"\n`;
            }
            
            // Insert Negotiations
            const [negoResult] = await pool.query(
                "INSERT INTO negotiations (id_order, deskripsi_kerusakan, rincian_barang, harga_barang, biaya_jasa, status_acc) VALUES ?",
                [insertNegoValues]
            );
            
            const firstNegoId = negoResult.insertId;
            let insertEvidenceValues = [];
            for (let i = 0; i < batchSize; i++) {
                const id_nego = firstNegoId + i;
                const d = ordersData[i];
                insertEvidenceValues.push([id_nego, d.foto_kerusakan, d.foto_nota, 'Bukti pergantian parts']);
            }
            
            // Insert Evidence
            await pool.query(
                "INSERT INTO evidence (id_nego, foto_kerusakan, foto_nota, deskripsi) VALUES ?",
                [insertEvidenceValues]
            );
            
            // Insert Ratings
            await pool.query(
                "INSERT INTO ratings (id_order, id_tech, id_pelanggan, nilai, komentar) VALUES ?",
                [insertRatingValues]
            );
        }

        // Update tech average ratings
        console.log("Updating technician average ratings...");
        for (const tech of techs) {
            const [avgRows] = await pool.query("SELECT AVG(nilai) as rata2 FROM ratings WHERE id_tech = ?", [tech.id_tech]);
            const avg = avgRows[0].rata2 || 0;
            await pool.query("UPDATE technicians SET rating_rata2 = ? WHERE id_tech = ?", [avg, tech.id_tech]);
        }

        fs.writeFileSync('transactions_2000.csv', csvData);
        console.log("Successfully generated 2000 COMPLETE transactions with evidence and ratings!");
        process.exit(0);
        
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

generate();
