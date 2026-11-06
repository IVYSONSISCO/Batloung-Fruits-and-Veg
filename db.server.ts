import mysql from "mysql2/promise";

// Server-only MySQL connection pool. Never imported from client code —
// the browser never sees these credentials or the mysql2 driver.
//
// Configure via environment variables (see .env.example):
//   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

let pool: mysql.Pool | undefined;

export function getPool(): mysql.Pool {
  if (!pool) {
    const env = process.env;
    pool = mysql.createPool({
      host: env["DB_HOST"] ?? "127.0.0.1",
      port: Number(env["DB_PORT"] ?? 3306),
      user: env["DB_USER"] ?? "root",
      password: env["DB_PASSWORD"] ?? "",
      database: env["DB_NAME"] ?? "batloung_fruits",
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return pool;
}
