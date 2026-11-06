import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Free OpenStreetMap tiles + Nominatim search: no account or API key needed.
const MASERU: [number, number] = [-29.3151, 27.4869];
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

export type PlaceResult = { name: string; latitude: number; longitude: number };

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=ls,za&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" }, signal: signal ?? null });
  const j = (await r.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return j.map((p) => ({ name: p.display_name, latitude: Number(p.lat), longitude: Number(p.lon) }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`, { headers: { Accept: "application/json" } });
    const j = await r.json();
    return j?.display_name ?? null;
  } catch {
    return null;
  }
}

function pinIcon(L: typeof Leaflet) {
  return L.divIcon({
    className: "",
    html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--primary);border:3px solid var(--background);box-shadow:0 2px 6px rgb(0 0 0 / .35)"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

type MapProps = {
  latitude: number | null;
  longitude: number | null;
  /** When set, the pin can be dragged and the map clicked to move it. */
  onPick?: (lat: number, lng: number) => void;
  label?: string;
  className?: string;
};

/** Browser-only map: Leaflet is loaded after mount so server rendering never touches it. */
export function VendorMap({ latitude, longitude, onPick, label, className }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod.default ?? mod) as typeof Leaflet;
      L.current = lib;
      const m = lib.map(el.current, { center: MASERU, zoom: 13 });
      lib.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
      if (pickRef.current) m.on("click", (e: Leaflet.LeafletMouseEvent) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setReady(true);
      setTimeout(() => m.invalidateSize(), 200);
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null; };
  }, []);

  useEffect(() => {
    const lib = L.current, m = map.current;
    if (!ready || !lib || !m) return;
    if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      marker.current?.remove(); marker.current = null; return;
    }
    const pos: [number, number] = [latitude, longitude];
    if (!marker.current) {
      marker.current = lib.marker(pos, { icon: pinIcon(lib), draggable: !!pickRef.current }).addTo(m);
      marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); pickRef.current?.(p.lat, p.lng); });
    } else marker.current.setLatLng(pos);
    if (label) marker.current.bindTooltip(label);
    m.setView(pos, Math.max(m.getZoom(), 16));
  }, [ready, latitude, longitude, label]);

  return <div className={`relative overflow-hidden rounded-md border ${className ?? "h-64"}`}>
    <div ref={el} className="absolute inset-0 z-0" />
    {!ready && <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>}
  </div>;
}

/** Search box with suggestions; choosing a place fills coordinates and the location name. */
export function PlaceSearch({ onSelect }: { onSelect: (place: PlaceResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [openList, setOpenList] = useState(false);

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchPlaces(q.trim(), ctrl.signal)); setOpenList(true); } catch { /* aborted */ }
      setLoading(false);
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  return <div className="relative">
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input className="pl-9" placeholder="Search a place, street or landmark…" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => results.length && setOpenList(true)} />
    {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
    {openList && results.length > 0 && <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
      {results.map((r, i) => <li key={i}><button type="button" className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { onSelect(r); setQ(r.name); setOpenList(false); }}><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{r.name}</span></button></li>)}
    </ul>}
    {openList && !loading && q.trim().length >= 3 && results.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No places found — try another name, or click the map.</p>}
  </div>;
}
