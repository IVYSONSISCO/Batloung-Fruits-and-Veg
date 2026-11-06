import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { VendorFilters } from "@/lib/vendor-filters";

export function VendorFilterFields({ value, onChange, hasOrigin }: { value: VendorFilters; onChange: (value: VendorFilters) => void; hasOrigin: boolean }) {
  const set = (key: keyof VendorFilters, next: string) => onChange({ ...value, [key]: next });
  const choices: { key: keyof VendorFilters; label: string; options: [string, string][] }[] = [
    { key: "status", label: "Status", options: [["all", "All statuses"], ["Active", "Active"], ["Inactive", "Inactive"]] },
    { key: "gps", label: "GPS", options: [["all", "All vendors"], ["recorded", "GPS recorded"], ["missing", "No GPS"]] },
    { key: "contact", label: "Telephone availability", options: [["all", "All vendors"], ["recorded", "With telephone"], ["missing", "No telephone"]] },
    { key: "sort", label: "Sort by", options: [["code", "Vendor code"], ["name", "Vendor name"], ["business", "Business name"], ["location", "Location"], ["newest", "Newest registered"], ["oldest", "Oldest registered"], ...(hasOrigin ? [["nearest", "Nearest first"]] as [string, string][] : [])] },
  ];
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {choices.map(({ key, label, options }) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Select value={value[key]} onValueChange={(next) => set(key, next)}><SelectTrigger className="w-full" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{options.map(([id, text]) => <SelectItem key={id} value={id}>{text}</SelectItem>)}</SelectContent></Select></div>)}
    {([["name", "Vendor name"], ["code", "Vendor code"], ["business", "Business name"], ["location", "Location"], ["telephone", "Telephone"], ["from", "Registered from"], ["to", "Registered to"]] as [keyof VendorFilters, string][]).map(([key, label]) => <div key={key} className="space-y-1.5"><Label htmlFor={`filter-${key}`}>{label}</Label><Input id={`filter-${key}`} type={key === "from" || key === "to" ? "date" : "text"} value={value[key]} onChange={(e) => set(key, e.target.value)} min={key === "to" ? value.from || undefined : undefined} max={key === "from" ? value.to || undefined : undefined} /></div>)}
  </div>;
}