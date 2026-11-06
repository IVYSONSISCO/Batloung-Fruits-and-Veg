export type { Fruit, BoxSize, Product } from "@/lib/api/catalogue.functions";
export type { Supplier } from "@/lib/api/suppliers.functions";
export type { Vendor } from "@/lib/api/vendors.functions";
export type { Purchase } from "@/lib/api/purchases.functions";
export type { OrderStatus } from "@/lib/api/orders.functions";

export type Province =
  | "Eastern Cape" | "Free State" | "Gauteng" | "KwaZulu-Natal" | "Limpopo"
  | "Mpumalanga" | "Northern Cape" | "North West" | "Western Cape";

export const provinces: Province[] = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-LS", { style: "currency", currency: "LSL" }).format(Number(value ?? 0));

export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-LS", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}