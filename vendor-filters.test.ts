import { describe, expect, test } from "vitest";
import { canUseVendorFilters, emptyVendorFilters, filterVendorDetails, sortVendorDetails } from "./vendor-filters";
const vendors = [
  { vendor_code: "BV-001", vendor_name: "Thato", business_name: "Fresh Fruit", location: "Maseru", telephone: "58123456", status: "Active", registration_date: "2026-10-01", latitude: 0, longitude: 0 },
  { vendor_code: "BV-002", vendor_name: "Anna", business_name: "Market Stall", location: "Roma", telephone: "", status: "Inactive", registration_date: "2026-10-23", latitude: null, longitude: null },
];
const codes = (rows: typeof vendors) => rows.map((v) => v.vendor_code);
describe("admin and sales vendor filters", () => {
  test("admins can use all vendor filters", () => expect(canUseVendorFilters(true, "admin")).toBe(true));
  test("sales staff keep access to vendor filters", () => expect(canUseVendorFilters(false, "sales")).toBe(true));
  test("unknown roles do not gain filter access", () => expect(canUseVendorFilters(false, null)).toBe(false));
  test("status limits results to active vendors", () => expect(codes(filterVendorDetails(vendors, "", { ...emptyVendorFilters, status: "Active" }))).toEqual(["BV-001"]));
  for (const [key, term] of [["name", "thato"], ["code", "001"], ["business", "fresh"], ["location", "maseru"], ["telephone", "5812"]] as const) {
    test(`${key} matches independently`, () => expect(codes(filterVendorDetails(vendors, "", { ...emptyVendorFilters, [key]: term }))).toEqual(["BV-001"]));
  }
  test("GPS availability excludes missing coordinates", () => expect(codes(filterVendorDetails(vendors, "", { ...emptyVendorFilters, gps: "recorded" }))).toEqual(["BV-001"]));
  test("telephone availability can select missing contacts", () => expect(codes(filterVendorDetails(vendors, "", { ...emptyVendorFilters, contact: "missing" }))).toEqual(["BV-002"]));
  test("registration range includes both boundary days", () => expect(codes(filterVendorDetails(vendors, "", { ...emptyVendorFilters, from: "2026-10-23", to: "2026-10-23" }))).toEqual(["BV-002"]));
  test("filters combine with text search rather than replacing it", () => expect(filterVendorDetails(vendors, "Roma", { ...emptyVendorFilters, status: "Active" })).toEqual([]));
  test("reset returns every vendor", () => expect(filterVendorDetails(vendors, "", emptyVendorFilters)).toEqual(vendors));
  test("sort can show newest registrations or vendor names first", () => {
    expect(codes(sortVendorDetails(vendors, "newest", null))).toEqual(["BV-002", "BV-001"]);
    expect(codes(sortVendorDetails(vendors, "name", null))).toEqual(["BV-002", "BV-001"]);
  });
});