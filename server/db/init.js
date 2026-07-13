import { getDb } from "./connection.js";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

export default async function initDb() {
  const db = await getDb();

  db.raw.run(`
    CREATE TABLE IF NOT EXISTS motor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merek TEXT NOT NULL,
      kapasitas REAL NOT NULL
    )
  `);

  db.raw.run(`
    CREATE TABLE IF NOT EXISTS bensin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_bbm TEXT NOT NULL UNIQUE,
      harga INTEGER NOT NULL
    )
  `);

  db.raw.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    )
  `);

  const motorCount = db.prepare("SELECT COUNT(*) AS c FROM motor").get();
  if (motorCount.c === 0) {
    db.prepare("INSERT INTO motor (merek, kapasitas) VALUES (?, ?)").run("Honda Beat", 4.2);
    db.prepare("INSERT INTO motor (merek, kapasitas) VALUES (?, ?)").run("Honda Vario", 5.0);
    db.prepare("INSERT INTO motor (merek, kapasitas) VALUES (?, ?)").run("Yamaha NMAX", 6.6);
    console.log("[DB] Seed data motor berhasil.");
  }

  const bensinCount = db.prepare("SELECT COUNT(*) AS c FROM bensin").get();
  if (bensinCount.c === 0) {
    db.prepare("INSERT INTO bensin (nama_bbm, harga) VALUES (?, ?)").run("Pertalite", 10000);
    db.prepare("INSERT INTO bensin (nama_bbm, harga) VALUES (?, ?)").run("Pertamax", 12950);
    db.prepare("INSERT INTO bensin (nama_bbm, harga) VALUES (?, ?)").run("Pertamax Turbo", 14400);
    console.log("[DB] Seed data bensin berhasil.");
  }

  const usersCount = db.prepare("SELECT COUNT(*) AS c FROM users").get();
  if (usersCount.c === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";

    if (!process.env.ADMIN_PASSWORD) {
      const randomPass = randomBytes(8).toString("hex");
      const hash = bcrypt.hashSync(randomPass, 10);
      db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
      console.log(`[DB] Admin user "${username}" dibuat dengan password: ${randomPass}`);
      console.log(`[DB] ⚠️  Simpan password ini! Set ADMIN_PASSWORD di .env untuk menggantinya.`);
    } else {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
      console.log(`[DB] Admin user "${username}" dibuat (password dari .env).`);
    }
  }

  console.log("[DB] Database siap.");
}
