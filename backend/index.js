import express from "express";
import cors from "cors";
import pg from "pg";
import apiRoutes from "./routes/api.js";
import "dotenv/config";

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. SETUP KONEKSI POSTGRESQL (Menggunakan URL dari .env)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

// Jalankan otomatis pembuatan tabel saat server pertama kali menyala
const initDb = async () => {
  try {
    // Buat Tabel Bensin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bensin (
        id SERIAL PRIMARY KEY, 
        nama_bbm TEXT, 
        harga INTEGER
      )
    `);

    // Buat Tabel Motor
    await pool.query(`
      CREATE TABLE IF NOT EXISTS motor (
        id SERIAL PRIMARY KEY, 
        merek TEXT, 
        kapasitas REAL
      )
    `);

    // Isi data awal jika tabel bensin kosong
    const bensinCheck = await pool.query("SELECT COUNT(*) FROM bensin");
    if (parseInt(bensinCheck.rows[0].count) === 0) {
      await pool.query(
        "INSERT INTO bensin (nama_bbm, harga) VALUES ('Pertamax', 13200), ('Pertalite', 10000)",
      );
    }

    // Isi data awal jika tabel motor kosong
    const motorCheck = await pool.query("SELECT COUNT(*) FROM motor");
    if (parseInt(motorCheck.rows[0].count) === 0) {
      await pool.query(
        "INSERT INTO motor (merek, kapasitas) VALUES ('Honda Karisma 125', 3.7), ('Honda Beat', 4.2)",
      );
    }

    console.log("Sukses: Terhubung dan Sinkronisasi ke PostgreSQL Cloud");
  } catch (err) {
    console.error("Gagal inisialisasi database PostgreSQL:", err.message);
  }
};

initDb();

// 2. HUBUNGKAN KE PETA JALAN API
app.use("/api", apiRoutes);

// 3. JALANKAN SERVER (Hanya jika di lokal komputer)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log(`Server Backend berjalan di http://localhost:${PORT}`),
  );
}

// WAJIB TAMBAHKAN INI UNTUK VERCEL:
import serverless from "serverless-http";
export default serverless(app);
