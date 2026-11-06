import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAuth } from "../auth.server";

const tokenSchema = z.object({ token: z.string().min(1) });

export const fetchDashboardSummary = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();
    const isAdmin = user.role === "admin";
    const [[fruitsRow], [suppliersRow], [vendorsRow], orderRows, stockRows] = await Promise.all([
      pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM fruits").then((r) => r[0]),
      pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM suppliers").then((r) => r[0]),
      pool.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM street_vendors").then((r) => r[0]),
      // Sales staff only see figures for the orders they created.
      (isAdmin
        ? pool.query<RowDataPacket[]>("SELECT status, total_amount FROM orders")
        : pool.query<RowDataPacket[]>("SELECT status, total_amount FROM orders WHERE created_by = ?", [user.id])
      ).then((r) => r[0]),
      pool.query<RowDataPacket[]>("SELECT stock_quantity FROM products").then((r) => r[0]),
    ]);

    const orders = orderRows.map((r) => ({ status: r["status"] as string, total_amount: Number(r["total_amount"]) }));
    const stock = stockRows.reduce((sum, r) => sum + (r["stock_quantity"] as number), 0);

    return {
      fruits: fruitsRow?.["n"] as number,
      suppliers: suppliersRow?.["n"] as number,
      vendors: vendorsRow?.["n"] as number,
      stock,
      orders: orders.length,
      pending: orders.filter((o) => o.status === "Pending").length,
      completed: orders.filter((o) => o.status === "Completed").length,
      statusRows: orders,
      sales: orders.filter((o) => o.status === "Completed").reduce((a, o) => a + o.total_amount, 0),
    };
  });

const reportSchema = z.object({ token: z.string().min(1), from: z.string(), to: z.string() });

export const fetchReports = createServerFn({ method: "POST" })
  .validator(reportSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();
    const isAdmin = user.role === "admin";
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT status, total_amount, order_date FROM orders
       WHERE order_date >= ? AND order_date <= ? ${isAdmin ? "" : "AND created_by = ?"}`,
      isAdmin ? [data.from, data.to] : [data.from, data.to, user.id],
    );
    const [productRows] = await pool.query<RowDataPacket[]>("SELECT stock_quantity FROM products");
    const [purchaseRows] = await pool.query<RowDataPacket[]>(
      "SELECT quantity, cost_price FROM purchases WHERE purchase_date >= ? AND purchase_date <= ?",
      [data.from, data.to],
    );
    const [vendorRows] = await pool.query<RowDataPacket[]>("SELECT status FROM street_vendors");

    return {
      orders: orderRows.map((r) => ({
        status: r["status"] as string,
        total_amount: Number(r["total_amount"]),
        order_date: r["order_date"] as string,
      })),
      stock: productRows.reduce((sum, r) => sum + (r["stock_quantity"] as number), 0),
      purchaseCost: purchaseRows.reduce((sum, r) => sum + Number(r["cost_price"]) * (r["quantity"] as number), 0),
      activeVendors: vendorRows.filter((r) => r["status"] === "Active").length,
    };
  });
