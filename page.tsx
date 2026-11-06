import type { ReactNode } from "react";
import { AlertCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

export function LoadingRows() {
  return <div className="py-16 text-center text-sm text-muted-foreground">Loading records…</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-destructive">
      <AlertCircle className="size-4" /> {message}
    </div>
  );
}

export function Metric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="surface-card min-w-0 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-display text-2xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}