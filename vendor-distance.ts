export type Coordinates = { latitude: number; longitude: number };
export type DistanceUnit = "m" | "km";

export function radiusInMeters(value: string, unit: DistanceUnit): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  const meters = unit === "km" ? amount * 1000 : amount;
  return Number.isFinite(meters) && meters > 0 ? meters : null;
}

export function withinRadius(km: number, radiusMeters: number): boolean {
  return Number.isFinite(km) && km >= 0 && Number.isFinite(radiusMeters) &&
    radiusMeters > 0 && km * 1000 <= radiusMeters;
}

export function filterVendorsByRadius<T extends { latitude: number | null; longitude: number | null }>(vendors: T[], origin: Coordinates | null, radiusMeters: number | null): T[] {
  if (radiusMeters === null) return vendors;
  if (!origin) return [];
  return vendors.filter((vendor) => hasCoordinates(vendor) && withinRadius(distanceKm(origin, vendor), radiusMeters));
}
type Locatable = { latitude: number | null; longitude: number | null; status: string };

export function hasCoordinates(value: { latitude: number | null; longitude: number | null }): value is Coordinates {
  return value.latitude !== null && value.longitude !== null &&
    Number.isFinite(value.latitude) && Number.isFinite(value.longitude) &&
    Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180;
}

// Great-circle distance; deliberately not a driving distance or travel time.
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) *
    Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export function rankVendors<T extends Locatable>(vendors: T[], origin: Coordinates) {
  return vendors.flatMap((vendor) => hasCoordinates(vendor) ? [{ vendor, distance: distanceKm(origin, vendor) }] : [])
    .sort((a, b) => a.distance - b.distance);
}

export function nearestActiveVendor<T extends Locatable>(vendors: T[], origin: Coordinates) {
  return rankVendors(vendors.filter((vendor) => vendor.status === "Active"), origin)[0] ?? null;
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export type TravelMode = "walking" | "driving";

// Planning estimates only: straight-line distance, no road routing or live traffic.
export const TRAVEL_SPEED_KMH: Record<TravelMode, number> = { walking: 5, driving: 30 };

export function distanceUnits(km: number) {
  if (!Number.isFinite(km) || km < 0) return null;
  return { meters: Math.round(km * 1000), kilometers: km.toFixed(3) };
}

export function estimatedTravelMinutes(km: number, mode: TravelMode): number | null {
  if (!Number.isFinite(km) || km < 0) return null;
  return km / TRAVEL_SPEED_KMH[mode] * 60;
}

export function formatTravelTime(minutes: number | null) {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return "Unavailable";
  if (minutes === 0) return "Already at the spot";
  if (minutes < 1) return "Less than 1 min";
  const rounded = Math.ceil(minutes);
  if (rounded < 60) return `About ${rounded} min`;
  const hours = Math.floor(rounded / 60), remainder = rounded % 60;
  return `About ${hours} hr${remainder ? ` ${remainder} min` : ""}`;
}
