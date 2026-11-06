import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAuth } from "../auth.server";

export type OrderStatus = "Pending" | "Confirmed" | "Processing" | "Ready" | "Completed" | "Cancelled";

export type Order = {
  id: string;
  order_number: string;
  vendor_id: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  stock_deducted: boolean;
  creator: { full_name: string; email: string } | null;
  street_vendors: {
    vendor_name: string;
    vendor_code: string;
    business_name: string;
    telephone: string;
    location: string;
    registration_date: string;
    status: "Active" | "Inactive";
  } | null;
};

export type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    id: string;
    stock_quantity: number;
    fruits: { name: string } | null;
    box_sizes: { name: string; units_per_box: number } | null;
  } | null;
};

const tokenSchema = z.object({ token: z.string().min(1) });

// Administrators see every order. Sales staff only ever see the orders
// they created themselves.
export const fetchOrders = createServerFn({ method: "POST" })
  .validator(tokenSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();
    const isAdmin = user.role === "admin";
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*, v.vendor_name, v.vendor_code, v.business_name, v.telephone, v.location,
              v.registration_date, v.status AS vendor_status,
              p.full_name AS creator_name, p.email AS creator_email
       FROM orders o
       JOIN street_vendors v ON v.id = o.vendor_id
       LEFT JOIN profiles p ON p.id = o.created_by
       ${isAdmin ? "" : "WHERE o.created_by = ?"}
       ORDER BY o.created_at DESC`,
      isAdmin ? [] : [user.id],
    );
    return rows.map(
      (r): Order => ({
        id: String(r["id"]),
        order_number: r["order_number"] as string,
        vendor_id: String(r["vendor_id"]),
        order_date: r["order_date"] as string,
        status: r["status"] as OrderStatus,
        total_amount: Number(r["total_amount"]),
        notes: r["notes"] as string,
        created_at: r["created_at"] as string,
        updated_at: r["updated_at"] as string,
        created_by: r["created_by"] == null ? null : String(r["created_by"]),
        stock_deducted: !!r["stock_deducted"],
        creator:
          r["created_by"] == null
            ? null
            : { full_name: (r["creator_name"] as string) ?? "", email: (r["creator_email"] as string) ?? "" },
        street_vendors: {
          vendor_name: r["vendor_name"] as string,
          vendor_code: r["vendor_code"] as string,
          business_name: r["business_name"] as string,
          telephone: r["telephone"] as string,
          location: r["location"] as string,
          registration_date: r["registration_date"] as string,
          status: r["vendor_status"] as "Active" | "Inactive",
        },
      }),
    );
  });

const itemsSchema = z.object({ token: z.string().min(1), orderId: z.string().min(1) });

export const fetchOrderItems = createServerFn({ method: "POST" })
  .validator(itemsSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();

    const [orderRows] = await pool.query<RowDataPacket[]>("SELECT created_by FROM orders WHERE id = ?", [
      data.orderId,
    ]);
    if (!orderRows[0]) throw new Error("Order not found.");
    if (user.role !== "admin" && orderRows[0]["created_by"] !== user.id) {
      throw new Error("You can only view your own orders.");
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT oi.*, p.stock_quantity, f.name AS fruit_name, b.name AS box_name, b.units_per_box
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN fruits f ON f.id = p.fruit_id
       JOIN box_sizes b ON b.id = p.box_size_id
       WHERE oi.order_id = ?`,
      [data.orderId],
    );
    return rows.map(
      (r): OrderItem => ({
        id: String(r["id"]),
        product_id: String(r["product_id"]),
        quantity: r["quantity"] as number,
        unit_price: Number(r["unit_price"]),
        subtotal: Number(r["subtotal"]),
        products: {
          id: String(r["product_id"]),
          stock_quantity: r["stock_quantity"] as number,
          fruits: { name: r["fruit_name"] as string },
          box_sizes: { name: r["box_name"] as string, units_per_box: r["units_per_box"] as number },
        },
      }),
    );
  });

function generateOrderNumber(): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(4).toString("hex").slice(0, 5).toUpperCase();
  return `ORD-${yy}${mm}${dd}-${suffix}`;
}

const createOrderSchema = z.object({
  token: z.string().min(1),
  vendorId: z.string().min(1),
  notes: z.string().default(""),
  lines: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() }))
    .min(1),
});

export const createOrder = createServerFn({ method: "POST" })
  .validator(createOrderSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // The order's vendor must be Active.
      const [vendorRows] = await conn.query<RowDataPacket[]>(
        "SELECT status FROM street_vendors WHERE id = ? FOR UPDATE",
        [data.vendorId],
      );
      if (!vendorRows[0]) throw new Error("Vendor not found.");
      if (vendorRows[0]["status"] !== "Active") {
        throw new Error("Order must belong to an active registered vendor.");
      }

      // Each product can only appear once per order.
      const productIds = data.lines.map((l) => l.productId);
      if (new Set(productIds).size !== productIds.length) {
        throw new Error("Each product can only appear once.");
      }

      const orderNumber = generateOrderNumber();
      const [orderResult] = await conn.execute(
        "INSERT INTO orders (order_number, vendor_id, notes, order_date, created_by) VALUES (?, ?, ?, CURDATE(), ?)",
        [orderNumber, data.vendorId, data.notes.trim(), user.id],
      );
      const orderId = (orderResult as { insertId: number }).insertId;

      let total = 0;
      for (const line of data.lines) {
        const [productRows] = await conn.query<RowDataPacket[]>(
          "SELECT unit_price, stock_quantity, is_active FROM products WHERE id = ? FOR UPDATE",
          [line.productId],
        );
        const product = productRows[0];
        if (!product) throw new Error("Product does not exist.");
        if (!product["is_active"]) throw new Error("Product is not available for sale.");
        if (line.quantity > (product["stock_quantity"] as number)) {
          throw new Error(`Only ${product["stock_quantity"]} boxes available in stock.`);
        }
        const unitPrice = Number(product["unit_price"]);
        const subtotal = line.quantity * unitPrice;
        total += subtotal;
        await conn.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)",
          [orderId, line.productId, line.quantity, unitPrice, subtotal],
        );
      }

      await conn.execute("UPDATE orders SET total_amount = ? WHERE id = ?", [total, orderId]);

      await conn.commit();
      return { id: String(orderId) };
    } catch (err) {
      await conn.rollback();
      throw err instanceof Error ? err : new Error("Could not create order.");
    } finally {
      conn.release();
    }
  });

// Status flow: Pending -> Confirmed -> Processing -> Ready -> Completed.
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  Pending: "Confirmed",
  Confirmed: "Processing",
  Processing: "Ready",
  Ready: "Completed",
};

const updateStatusSchema = z.object({
  token: z.string().min(1),
  orderId: z.string().min(1),
  status: z.enum(["Pending", "Confirmed", "Processing", "Ready", "Completed", "Cancelled"]),
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(updateStatusSchema)
  .handler(async ({ data }) => {
    const user = await requireAuth(data.token);
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderRows] = await conn.query<RowDataPacket[]>(
        "SELECT status, stock_deducted, created_by FROM orders WHERE id = ? FOR UPDATE",
        [data.orderId],
      );
      const order = orderRows[0];
      if (!order) throw new Error("Order not found.");
      const oldStatus = order["status"] as OrderStatus;

      // Sales staff may only touch their own orders, and may only cancel them.
      // Only an Administrator can approve or progress an order.
      if (user.role !== "admin") {
        if (order["created_by"] !== user.id) throw new Error("You can only change your own orders.");
        if (data.status !== "Cancelled") {
          throw new Error("Only an administrator can approve or progress orders. Sales staff may only cancel.");
        }
      }

      if (oldStatus === "Completed") throw new Error("A completed order cannot change status.");
      if (oldStatus === "Cancelled") throw new Error("A cancelled order cannot be reopened.");
      if (data.status !== "Cancelled" && ALLOWED_TRANSITIONS[oldStatus] !== data.status) {
        throw new Error(`Invalid status change: ${oldStatus} to ${data.status}.`);
      }

      if (data.status === "Completed" && !order["stock_deducted"]) {
        const [items] = await conn.query<RowDataPacket[]>(
          "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
          [data.orderId],
        );
        if (items.length === 0) throw new Error("An order must contain at least one item.");
        for (const item of items) {
          const [productRows] = await conn.query<RowDataPacket[]>(
            "SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE",
            [item["product_id"]],
          );
          const available = productRows[0]?.["stock_quantity"] as number;
          if (available < (item["quantity"] as number)) {
            throw new Error("Not enough stock to complete this order.");
          }
        }
        for (const item of items) {
          await conn.execute("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [
            item["quantity"],
            item["product_id"],
          ]);
        }
        await conn.execute("UPDATE orders SET status = ?, stock_deducted = TRUE WHERE id = ?", [
          data.status,
          data.orderId,
        ]);
      } else {
        await conn.execute("UPDATE orders SET status = ? WHERE id = ?", [data.status, data.orderId]);
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err instanceof Error ? err : new Error("Could not update order status.");
    } finally {
      conn.release();
    }
  });
