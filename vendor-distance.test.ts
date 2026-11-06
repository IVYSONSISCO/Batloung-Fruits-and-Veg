import { describe, expect, test } from "vitest";
import { distanceUnits, estimatedTravelMinutes, distanceKm, hasCoordinates, nearestActiveVendor, rankVendors, radiusInMeters, withinRadius, filterVendorsByRadius } from "./vendor-distance";

describe("salesperson nearest vendor", () => {
  const origin = { latitude: -29.315, longitude: 27.487 };
  const vendors = [
    { id: "far", latitude: -29.335, longitude: 27.487, status: "Active" },
    { id: "near", latitude: -29.316, longitude: 27.487, status: "Active" },
    { id: "missing", latitude: null, longitude: null, status: "Active" },
  ];
  test("suggests the closest vendor to the salesperson, not the first vendor", () => {
    expect(nearestActiveVendor(vendors, origin)?.vendor.id).toBe("near");
    expect(rankVendors(vendors, origin).map((entry) => entry.vendor.id)).toEqual(["near", "far"]);
    expect(nearestActiveVendor(vendors, origin)?.distance).toBeCloseTo(0.111195, 5);
  });
  test("only suggests active vendors", () => {
    expect(nearestActiveVendor([...vendors, { id: "inactive", ...origin, status: "Inactive" }], origin)?.vendor.id).toBe("near");
  });
  test("does not invent a suggestion for missing coordinates", () => {
    expect(nearestActiveVendor([vendors[2]!], origin)).toBeNull();
  });
  test("accepts zero coordinates and rejects invalid coordinates", () => {
    expect(hasCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
    expect(hasCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(hasCoordinates({ latitude: 0, longitude: NaN })).toBe(false);
    expect(hasCoordinates({ latitude: 0, longitude: null })).toBe(false);
  });
  test("same-location distance is zero", () => {
    expect(distanceKm(origin, origin)).toBe(0);
  });
});

describe("vendor distance units and travel estimates", () => {
  test("reports 33 meters as 0.033 kilometers", () => {
    expect(distanceUnits(0.033)).toEqual({ meters: 33, kilometers: "0.033" });
  });
  test("reports a kilometer in both units", () => {
    expect(distanceUnits(1)).toEqual({ meters: 1000, kilometers: "1.000" });
  });
  test("walking estimate uses distance and walking speed", () => {
    expect(estimatedTravelMinutes(1, "walking")).toBe(12);
  });
  test("driving estimate uses distance and driving speed", () => {
    expect(estimatedTravelMinutes(1, "driving")).toBe(2);
  });
  test("same spot takes zero minutes", () => {
    expect(estimatedTravelMinutes(0, "walking")).toBe(0);
  });
  test("invalid distances do not create estimates", () => {
    expect(estimatedTravelMinutes(NaN, "walking")).toBeNull();
    expect(distanceUnits(-1)).toBeNull();
  });
});

describe("vendor search distance radius", () => {
  test("2-meter filter includes the boundary but excludes unrounded distances above it", () => {
    expect(radiusInMeters("2", "m")).toBe(2);
    expect(withinRadius(0.0019, 2)).toBe(true);
    expect(withinRadius(0.002, 2)).toBe(true);
    expect(withinRadius(0.00201, 2)).toBe(false);
  });
  test("kilometer selection uses the same physical radius", () => {
    expect(radiusInMeters("0.002", "km")).toBe(2);
    expect(radiusInMeters("2", "km")).toBe(2000);
  });
  test("an active radius requires an origin and valid vendor GPS", () => {
    const origin = { latitude: 0, longitude: 0 };
    const vendors = [{ id: "here", ...origin }, { id: "far", latitude: 0.001, longitude: 0 }, { id: "missing", latitude: null, longitude: null }];
    expect(filterVendorsByRadius(vendors, origin, 2).map((v) => v.id)).toEqual(["here"]);
    expect(filterVendorsByRadius(vendors, null, 2)).toEqual([]);
    expect(filterVendorsByRadius(vendors, null, null)).toEqual(vendors);
  });
  test("invalid radii cannot be applied", () => {
    for (const value of ["", " ", "0", "-2", "bad", "Infinity"]) expect(radiusInMeters(value, "m")).toBeNull();
  });
});
