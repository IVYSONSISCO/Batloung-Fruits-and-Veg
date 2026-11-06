import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAdmin } from "../auth.server";

export type Fruit = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
};

export type BoxSize = {
  id: string;
  name: "Small" | "Medium" | "Large";
  units_per_box: number;
  description: string;
};

export type Product = {
  id: string;
  fruit_id: string;
  box_size_id: string;
  unit_price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  fruits: { name: string } | null;
  box_sizes: { name: string; units_per_box: number } | null;
};

export const fetchFruits = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM fruits ORDER BY name");
  return rows.map(
    (r): Fruit => ({
      id: String(r["id"]),
      name: r["name"] as string,
      description: r["description"] as string,
      is_active: !!r["is_active"],
    }),
  );
});

export const fetchBoxSizes = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM box_sizes ORDER BY units_per_box");
  return rows.map(
    (r): BoxSize => ({
      id: String(r["id"]),
      name: r["name"] as BoxSize["name"],
      units_per_box: r["units_per_box"] as number,
      description: r["description"] as string,
    }),
  );
});

export const fetchProducts = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, f.name AS fruit_name, b.name AS box_name, b.units_per_box
     FROM products p
     JOIN fruits f ON f.id = p.fruit_id
     JOIN box_sizes b ON b.id = p.box_size_id
     ORDER BY p.created_at`,
  );
  return rows.map(
    (r): Product => ({
      id: String(r["id"]),
      fruit_id: String(r["fruit_id"]),
      box_size_id: String(r["box_size_id"]),
      unit_price: Number(r["unit_price"]),
      stock_quantity: r["stock_quantity"] as number,
      is_active: !!r["is_active"],
      created_at: r["created_at"] as string,
      fruits: { name: r["fruit_name"] as string },
      box_sizes: { name: r["box_name"] as string, units_per_box: r["units_per_box"] as number },
    }),
  );
});

const createFruitSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(""),
});

export const createFruit = createServerFn({ method: "POST" })
  .validator(createFruitSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    try {
      await pool.execute("INSERT INTO fruits (name, description) VALUES (?, ?)", [
        data.name.trim(),
        data.description.trim(),
      ]);
    } catch (err) {
      throw duplicateAware(err, "A fruit with that name already exists.");
    }
  });

const createProductSchema = z.object({
  token: z.string().min(1),
  fruitId: z.string().min(1),
  boxSizeId: z.string().min(1),
  unitPrice: z.number().positive(),
});

export const createProduct = createServerFn({ method: "POST" })
  .validator(createProductSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    try {
      await pool.execute(
        "INSERT INTO products (fruit_id, box_size_id, unit_price) VALUES (?, ?, ?)",
        [data.fruitId, data.boxSizeId, data.unitPrice],
      );
    } catch (err) {
      throw duplicateAware(err, "That fruit and box size combination already exists.");
    }
  });

const updateProductSchema = z.object({
  token: z.string().min(1),
  id: z.string().min(1),
  fruitId: z.string().min(1),
  boxSizeId: z.string().min(1),
  unitPrice: z.number().positive(),
  isActive: z.boolean(),
});

export const updateProduct = createServerFn({ method: "POST" })
  .validator(updateProductSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    try {
      await pool.execute(
        "UPDATE products SET fruit_id = ?, box_size_id = ?, unit_price = ?, is_active = ? WHERE id = ?",
        [data.fruitId, data.boxSizeId, data.unitPrice, data.isActive, data.id],
      );
    } catch (err) {
      throw duplicateAware(err, "That fruit and box size combination already exists.");
    }
  });

function duplicateAware(err: unknown, message: string): Error {
  if (err && typeof err === "object" && "code" in err && err.code === "ER_DUP_ENTRY") {
    return new Error(message);
  }
  return err instanceof Error ? err : new Error("Something went wrong.");
}
