import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2";

import { getPool } from "./db.server";

// Session-based auth backed by a MySQL sessions table, with server-side
// role checks (admin vs sales). Never imported from client code.

export type AppRole = "admin" | "sales";

export type AuthedUser = {
  id: number;
  fullName: string;
  email: string;
  role: AppRole;
};

const SESSION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const pool = getPool();
  const token = crypto.randomBytes(32).toString("hex");
  await pool.execute(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    [token, userId, SESSION_DAYS],
  );
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const pool = getPool();
  await pool.execute("DELETE FROM sessions WHERE token = ?", [token]);
}

/** Resolves a session token to the signed-in staff member, or null. */
export async function getUserFromToken(token: string | undefined | null): Promise<AuthedUser | null> {
  if (!token) return null;
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.full_name, p.email,
            COALESCE((SELECT role FROM user_roles WHERE user_id = p.id AND role = 'admin' LIMIT 1), 'sales') AS role
     FROM sessions s
     JOIN profiles p ON p.id = s.user_id
     WHERE s.token = ? AND s.expires_at > NOW()`,
    [token],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row["id"] as number,
    fullName: row["full_name"] as string,
    email: row["email"] as string,
    role: row["role"] as AppRole,
  };
}

/** Throws if the token doesn't belong to a signed-in staff member. */
export async function requireAuth(token: string | undefined | null): Promise<AuthedUser> {
  const user = await getUserFromToken(token);
  if (!user) throw new Error("You must be signed in.");
  return user;
}

/** Throws unless the token belongs to an Administrator. */
export async function requireAdmin(token: string | undefined | null): Promise<AuthedUser> {
  const user = await requireAuth(token);
  if (user.role !== "admin") throw new Error("Only Administrators can do this.");
  return user;
}
