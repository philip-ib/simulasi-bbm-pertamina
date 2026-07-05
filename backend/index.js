import express from "express";
import cors from "cors";
import pg from "pg";
import apiRoutes from "./routes/api.js";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import serverless from "serverless-http";
import "dotenv/config";

// Validasi Environment Variables — gunakan console.error saja di serverless (process.exit akan crash)
if (!process.env.SECRET_KEY || !process.env.DATABASE_URL) {
  console.error("FATAL ERROR: SECRET_KEY atau DATABASE_URL belum di-set di environment.");
}

const { Pool } = pg;
export const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurasi CORS yang kompatibel untuk semua environment (lokal & Vercel)
const allowedOrigins = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (misalnya dari curl atau Postman)
      if (!origin) return callback(null, true);
      // Izinkan semua sub-domain Vercel
      if (origin.includes(".vercel.app") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// 1. SETUP KONEKSI POSTGRESQL
// Bersihkan DATABASE_URL dari parameter 'channel_binding' yang tidak didukung
const rawDbUrl = process.env.DATABASE_URL || "";
const cleanDbUrl = rawDbUrl.replace(/[&?]channel_binding=[^&]*/g, "").replace(/\?$/, "");

export const pool = new Pool({
  connectionString: cleanDbUrl,
  ssl: cleanDbUrl.includes("localhost")
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

    // Buat Tabel Users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    // Isi data admin default jika tabel users kosong
    const userCheck = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCheck.rows[0].count) === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || "admin";
      const defaultPassword = process.env.ADMIN_PASSWORD || "123456";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        [defaultUsername, hashedPassword]
      );
    }

    console.log("Sukses: Terhubung dan Sinkronisasi ke PostgreSQL Cloud");
  } catch (err) {
    console.error("Gagal inisialisasi database PostgreSQL:", err.message);
  }
};

if (process.env.NODE_ENV !== "test") {
  initDb();
}

// 2. HUBUNGKAN KE PETA JALAN API
app.use("/api", apiRoutes);

// 3. JALANKAN SERVER (Hanya jika di lokal komputer)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT, () =>
    console.log(`Server Backend berjalan di http://localhost:${PORT}`),
  );
}

// EXPORT UNTUK VERCEL SERVERLESS
export default serverless(app);
