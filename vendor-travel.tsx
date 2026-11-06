import { Car, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { distanceUnits, estimatedTravelMinutes, formatDistance, formatTravelTime, TRAVEL_SPEED_KMH } from "@/lib/vendor-distance";
import type { TravelMode } from "@/lib/vendor-distance";

export function TravelModeSelector({ mode, onChange }: { mode: TravelMode; onChange: (mode: TravelMode) => void }) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Travel mode">
    <Button size="sm" variant={mode === "walking" ? "default" : "outline"} aria-pressed={mode === "walking"} onClick={() => onChange("walking")}><Footprints /> Walking</Button>
    <Button size="sm" variant={mode === "driving" ? "default" : "outline"} aria-pressed={mode === "driving"} onClick={() => onChange("driving")}><Car /> Driving</Button>
  </div>;
}

export function VendorTravel({ km, mode, compact = false }: { km: number; mode: TravelMode; compact?: boolean }) {
  const units = distanceUnits(km);
  if (!units) return <span className="text-sm text-muted-foreground">Distance unavailable</span>;
  return <div className="space-y-1" aria-live="polite">
    <p className={compact ? "font-medium" : "text-xl font-semibold text-primary"}>{formatDistance(km)}</p>
    <p className="text-xs text-muted-foreground">{units.meters.toLocaleString()} m · {units.kilometers} km</p>
    <p className="text-sm font-medium">{formatTravelTime(estimatedTravelMinutes(km, mode))} {km > 0 ? (mode === "walking" ? "on foot" : "by car") : ""}</p>
    {!compact && <p className="max-w-xs text-xs text-muted-foreground">Straight-line distance · rough estimate at {TRAVEL_SPEED_KMH[mode]} km/h. Roads, terrain and traffic may increase travel time.</p>}
  </div>;
}
