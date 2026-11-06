import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAdmin } from "../auth.server";

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
] as const;

export type Purchase = {
  id: string;
  province: (typeof PROVINCES)[number];
  quantity: number;
  cost_price: number;
  purchase_date: string;
  suppliers: { name: string } | null;
  products: { id: string; fruits: { name: string } | null; box_sizes: { name: string } | null } | null;
};

export const fetchPurchases = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pu.*, s.name AS supplier_name, f.name AS fruit_name, b.name AS box_name
     FROM purchases pu
     JOIN suppliers s ON s.id = pu.supplier_id
     JOIN products p ON p.id = pu.product_id
     JOIN fruits f ON f.id = p.fruit_id
     JOIN box_sizes b ON b.id = p.box_size_id
     ORDER BY pu.purchase_date DESC`,
  );
  return rows.map(
    (r): Purchase => ({
      id: String(r["id"]),
      province: r["province"] as Purchase["province"],
      quantity: r["quantity"] as number,
      cost_price: Number(r["cost_price"]),
      purchase_date: r["purchase_date"] as string,
      suppliers: { name: r["supplier_name"] as string },
      products: {
        id: String(r["product_id"]),
        fruits: { name: r["fruit_name"] as string },
        box_sizes: { name: r["box_name"] as string },
      },
    }),
  );
});

const createSchema = z.object({
  token: z.string().min(1),
  supplierId: z.string().min(1),
  productId: z.string().min(1),
  province: z.enum(PROVINCES),
  quantity: z.number().int().positive(),
  costPrice: z.number().positive(),
  notes: z.string().default(""),
});

export const createPurchase = createServerFn({ method: "POST" })
  .validator(createSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO purchases (supplier_id, product_id, province, quantity, cost_price, purchase_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
        [data.supplierId, data.productId, data.province, data.quantity, data.costPrice, data.notes.trim(), admin.id],
      );
      // Mirrors apply_purchase_to_stock(): a purchase always increases stock.
      await conn.execute(
        "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
        [data.quantity, data.productId],
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err instanceof Error ? err : new Error("Could not record purchase.");
    } finally {
      conn.release();
    }
  });
