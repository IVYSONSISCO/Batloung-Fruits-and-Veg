import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

import { getPool } from "../db.server";
import { requireAdmin } from "../auth.server";

export type Vendor = {
  id: string;
  vendor_code: string;
  vendor_name: string;
  business_name: string;
  telephone: string;
  location: string;
  registration_date: string;
  status: "Active" | "Inactive";
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_updated_at: string | null;
};

const num = (v: unknown): number | null => (v == null ? null : Number(v));

export const fetchVendors = createServerFn({ method: "GET" }).handler(async () => {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM street_vendors ORDER BY vendor_code");
  return rows.map(
    (r): Vendor => ({
      id: String(r["id"]),
      vendor_code: r["vendor_code"] as string,
      vendor_name: r["vendor_name"] as string,
      business_name: r["business_name"] as string,
      telephone: r["telephone"] as string,
      location: r["location"] as string,
      registration_date: r["registration_date"] as string,
      status: r["status"] as Vendor["status"],
      latitude: num(r["latitude"]),
      longitude: num(r["longitude"]),
      location_accuracy: num(r["location_accuracy"]),
      location_updated_at: r["location_updated_at"] ? String(r["location_updated_at"]).replace(" ", "T") : null,
    }),
  );
});

const baseSchema = z.object({
  token: z.string().min(1),
  vendorCode: z.string().min(1),
  vendorName: z.string().min(1),
  businessName: z.string().default(""),
  telephone: z.string().default(""),
  location: z.string().default(""),
  status: z.enum(["Active", "Inactive"]),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
});

function checkPair(lat: number | null, lng: number | null) {
  if ((lat == null) !== (lng == null)) throw new Error("Enter both latitude and longitude, or leave both empty.");
}

function duplicateAware(err: unknown): Error {
  if (err && typeof err === "object" && "code" in err && err.code === "ER_DUP_ENTRY") {
    return new Error("That vendor code is already taken.");
  }
  return err instanceof Error ? err : new Error("Something went wrong.");
}

export const createVendor = createServerFn({ method: "POST" })
  .validator(baseSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    checkPair(data.latitude, data.longitude);
    const hasPoint = data.latitude != null && data.longitude != null;
    const pool = getPool();
    try {
      await pool.execute(
        `INSERT INTO street_vendors
           (vendor_code, vendor_name, business_name, telephone, location, registration_date, status, latitude, longitude, location_updated_at)
         VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ${hasPoint ? "NOW()" : "NULL"})`,
        [data.vendorCode.trim().toUpperCase(), data.vendorName.trim(), data.businessName.trim(), data.telephone.trim(), data.location.trim(), data.status, data.latitude, data.longitude],
      );
    } catch (err) {
      throw duplicateAware(err);
    }
  });

const updateSchema = baseSchema.extend({ id: z.string().min(1) });

export const updateVendor = createServerFn({ method: "POST" })
  .validator(updateSchema)
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    checkPair(data.latitude, data.longitude);
    const pool = getPool();
    const [cur] = await pool.query<RowDataPacket[]>("SELECT latitude, longitude FROM street_vendors WHERE id = ?", [data.id]);
    if (cur.length === 0) throw new Error("Vendor not found.");
    const moved = num(cur[0]!["latitude"]) !== data.latitude || num(cur[0]!["longitude"]) !== data.longitude;
    // When the position was edited by hand, restamp it (or clear it) and forget the old GPS accuracy.
    const stamp = moved ? (data.latitude == null ? ", location_updated_at = NULL, location_accuracy = NULL" : ", location_updated_at = NOW(), location_accuracy = NULL") : "";
    try {
      await pool.execute(
        `UPDATE street_vendors
         SET vendor_code = ?, vendor_name = ?, business_name = ?, telephone = ?, location = ?, status = ?, latitude = ?, longitude = ?${stamp}
         WHERE id = ?`,
        [data.vendorCode.trim().toUpperCase(), data.vendorName.trim(), data.businessName.trim(), data.telephone.trim(), data.location.trim(), data.status, data.latitude, data.longitude, data.id],
      );
    } catch (err) {
      throw duplicateAware(err);
    }
  });

// Live GPS: the browser sends the device position every ~15 seconds while sharing is on.
export const updateVendorLocation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      id: z.string().min(1),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).nullable().default(null),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const pool = getPool();
    const [res] = await pool.execute(
      "UPDATE street_vendors SET latitude = ?, longitude = ?, location_accuracy = ?, location_updated_at = NOW() WHERE id = ?",
      [data.latitude, data.longitude, data.accuracy, data.id],
    );
    if ((res as { affectedRows: number }).affectedRows === 0) throw new Error("Vendor not found.");
  });
