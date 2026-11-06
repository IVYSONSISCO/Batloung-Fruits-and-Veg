import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

import { getPool } from "../db.server";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getUserFromToken,
  type AppRole,
} from "../auth.server";

// First six registered accounts become Administrators; every account
// after that is Sales — ported from the handle_new_user() trigger.
const ADMIN_SLOT_COUNT = 6;

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerUser = createServerFn({ method: "POST" })
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const pool = getPool();

    const [existingEmail] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM profiles WHERE email = ?",
      [data.email],
    );
    if (existingEmail.length > 0) {
      throw new Error("An account with that email already exists.");
    }

    const passwordHash = await hashPassword(data.password);
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO profiles (full_name, email, password_hash) VALUES (?, ?, ?)",
      [data.fullName.trim(), data.email, passwordHash],
    );
    const userId = result.insertId;

    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM user_roles",
    );
    const existingAccounts = countRows[0]?.["total"] as number;
    const role: AppRole = existingAccounts < ADMIN_SLOT_COUNT ? "admin" : "sales";
    await pool.execute("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [userId, role]);

    const token = await createSession(userId);
    return { token, user: { id: userId, fullName: data.fullName.trim(), email: data.email, role } };
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const loginUser = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const pool = getPool();

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, full_name, password_hash FROM profiles WHERE email = ?",
      [data.email],
    );
    const row = rows[0];
    if (!row) throw new Error("Invalid email or password.");

    const ok = await verifyPassword(data.password, row["password_hash"] as string);
    if (!ok) throw new Error("Invalid email or password.");

    const userId = row["id"] as number;
    const [roleRows] = await pool.query<RowDataPacket[]>(
      "SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
      [userId],
    );
    const role: AppRole = roleRows[0] ? "admin" : "sales";

    const token = await createSession(userId);
    return { token, user: { id: userId, fullName: row["full_name"] as string, email: data.email, role } };
  });

const tokenSchema = z.object({ token: z.string().min(1) });

export const getCurrentUser = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const user = await getUserFromToken(data.token);
    if (!user) throw new Error("Session expired. Please sign in again.");
    return user;
  });

export const signOutUser = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    await destroySession(data.token);
  });
