import { distanceKm, hasCoordinates } from "./vendor-distance";
import type { Coordinates } from "./vendor-distance";

export function canUseVendorFilters(isAdmin: boolean, role: string | null | undefined): boolean {
  return isAdmin || role === "sales";
}

export type VendorFilters = {
  status: string; name: string; code: string; business: string; location: string;
  telephone: string; gps: string; contact: string; from: string; to: string; sort: string;
};
export const emptyVendorFilters: VendorFilters = {
  status: "all", name: "", code: "", business: "", location: "", telephone: "",
  gps: "all", contact: "all", from: "", to: "", sort: "code",
};
type FilterableVendor = {
  vendor_code: string; vendor_name: string; business_name: string; location: string;
  telephone: string; status: string; registration_date: string;
  latitude: number | null; longitude: number | null;
};
const contains = (value: string, term: string) => (value ?? "").toLowerCase().includes(term.trim().toLowerCase());

export function filterVendorDetails<T extends FilterableVendor>(vendors: T[], search: string, filters: VendorFilters): T[] {
  return vendors.filter((v) => {
    const day = v.registration_date.slice(0, 10);
    return contains(`${v.vendor_code} ${v.vendor_name} ${v.business_name} ${v.location} ${v.telephone} ${v.status}`, search) &&
      (filters.status === "all" || v.status === filters.status) &&
      contains(v.vendor_name, filters.name) && contains(v.vendor_code, filters.code) &&
      contains(v.business_name, filters.business) && contains(v.location, filters.location) &&
      contains(v.telephone, filters.telephone) &&
      (filters.gps === "all" || hasCoordinates(v) === (filters.gps === "recorded")) &&
      (filters.contact === "all" || Boolean(v.telephone?.trim()) === (filters.contact === "recorded")) &&
      (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
  });
}

export function sortVendorDetails<T extends FilterableVendor>(vendors: T[], sort: string, origin: Coordinates | null): T[] {
  return [...vendors].sort((a, b) => {
    const fallback = a.vendor_code.localeCompare(b.vendor_code);
    if (sort === "nearest" && origin) {
      const left = hasCoordinates(a) ? distanceKm(origin, a) : Infinity;
      const right = hasCoordinates(b) ? distanceKm(origin, b) : Infinity;
      return left - right || fallback;
    }
    if (sort === "newest" || sort === "oldest") return (sort === "newest" ? -1 : 1) * a.registration_date.localeCompare(b.registration_date) || fallback;
    if (sort === "name") return a.vendor_name.localeCompare(b.vendor_name) || fallback;
    if (sort === "business") return a.business_name.localeCompare(b.business_name) || fallback;
    if (sort === "location") return a.location.localeCompare(b.location) || fallback;
    return fallback;
  });
}