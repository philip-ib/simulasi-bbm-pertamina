import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set env vars BEFORE importing app (ESM needs this before dynamic import)
process.env.NODE_ENV = "test";
process.env.DB_PATH = path.join(__dirname, "..", "test-data.db");
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "admin123";

// Clean old test DB
if (fs.existsSync(process.env.DB_PATH)) {
  fs.unlinkSync(process.env.DB_PATH);
}

// Dynamic import so env vars are set first
const appModule = await import("../index.js");
const app = appModule.default;

// Wait for DB init
await new Promise((r) => setTimeout(r, 500));

afterAll(() => {
  if (fs.existsSync(process.env.DB_PATH)) {
    fs.unlinkSync(process.env.DB_PATH);
  }
});

describe("API /api/motor", () => {
  test("GET /api/motor returns motor list", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).get("/api/motor");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(res.body[0]).toHaveProperty("merek");
    expect(res.body[0]).toHaveProperty("kapasitas");
  });

  test("POST /api/motor without auth returns 401", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).post("/api/motor").send({ merek: "Test", kapasitas: 5 });
    expect(res.status).toBe(401);
  });
});

describe("API /api/bbm", () => {
  test("GET /api/bbm returns BBM list", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).get("/api/bbm");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
});

describe("API /api/simulasi", () => {
  test("calculates (uang) correctly", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/simulasi")
      .send({ inputUser: 20000, tipeInput: "uang", kapasitasTangki: 4.2, hargaBbm: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.literDidapat).toBe(2);
    expect(res.body.totalBiaya).toBe(20000);
    expect(res.body.persentaseTangki).toBe(47.6);
    expect(res.body.status).toBe("Aman");
  });

  test("overflow warning", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/simulasi")
      .send({ inputUser: 10, tipeInput: "liter", kapasitasTangki: 4.2, hargaBbm: 10000 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Meluber! Tangki tidak muat.");
  });

  test("validation rejects missing fields", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).post("/api/simulasi").send({});
    expect(res.status).toBe(400);
  });
});

describe("API /api/auth", () => {
  test("login with correct credentials", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login Berhasil!");
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("token="))).toBe(true);
  });

  test("login with wrong password", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(400);
  });

  test("login with wrong username", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "nonexistent", password: "admin123" });
    expect(res.status).toBe(400);
  });
});

describe("Protected routes", () => {
  let tokenCookie;

  beforeAll(async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "admin", password: "admin123" });
    tokenCookie = res.headers["set-cookie"][0];
  });

  test("POST /api/motor with valid token", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/motor")
      .set("Cookie", tokenCookie)
      .send({ merek: "Test Motor", kapasitas: 5.5 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  test("DELETE /api/motor by id", async () => {
    const { default: request } = await import("supertest");
    // Create then delete
    const create = await request(app)
      .post("/api/motor")
      .set("Cookie", tokenCookie)
      .send({ merek: "Delete Me", kapasitas: 3.0 });
    const id = create.body.id;
    const res = await request(app)
      .delete(`/api/motor/${id}`)
      .set("Cookie", tokenCookie);
    expect(res.status).toBe(200);
  });
});
