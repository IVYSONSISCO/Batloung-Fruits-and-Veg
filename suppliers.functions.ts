import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAdmin } from "../auth.server";

const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
] as const;
const provinceSchema = z.enum(PROVINCES);

export type Supplier = {
  id: string;
  name: string;
  province: (typeof PROVINCES)[number];
  contact_person: string;
  telephone: string;
  email: string;
  physical_address: string;
  is_active: boolean;
};

export const fetchSuppliers = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM suppliers ORDER BY name");
  return rows.map(
    (r): Supplier => ({
      id: String(r["id"]),
      name: r["name"] as string,
      province: r["province"] as Supplier["province"],
      contact_person: r["contact_person"] as string,
      telephone: r["telephone"] as string,
      email: r["email"] as string,
      physical_address: r["physical_address"] as string,
      is_active: !!r["is_active"],
    }),
  );
});

const createSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  province: provinceSchema,
  contactPerson: z.string().default(""),
  telephone: z.string().default(""),
  email: z.string().default(""),
  physicalAddress: z.string().default(""),
});

export const createSupplier = createServerFn({ method: "POST" })
  .validator(createSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    await pool.execute(
      `INSERT INTO suppliers (name, province, contact_person, telephone, email, physical_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name.trim(), data.province, data.contactPerson.trim(), data.telephone.trim(), data.email.trim(), data.physicalAddress.trim()],
    );
  });

const updateSchema = createSchema.extend({
  id: z.string().min(1),
  isActive: z.boolean(),
});

export const updateSupplier = createServerFn({ method: "POST" })
  .validator(updateSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    await pool.execute(
      `UPDATE suppliers
       SET name = ?, province = ?, contact_person = ?, telephone = ?, email = ?, physical_address = ?, is_active = ?
       WHERE id = ?`,
      [
        data.name.trim(),
        data.province,
        data.contactPerson.trim(),
        data.telephone.trim(),
        data.email.trim(),
        data.physicalAddress.trim(),
        data.isActive,
        data.id,
      ],
    );
  });
