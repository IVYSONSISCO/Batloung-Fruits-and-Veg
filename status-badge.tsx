import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/management";

export function StatusBadge({ status }: { status: OrderStatus | "Active" | "Inactive" }) {
  const className =
    status === "Completed" || status === "Active"
      ? "border-success/25 bg-success/10 text-success"
      : status === "Cancelled" || status === "Inactive"
        ? "border-destructive/25 bg-destructive/10 text-destructive"
        : status === "Ready"
          ? "border-info/25 bg-info/10 text-info"
          : status === "Processing"
            ? "border-warning/30 bg-warning/15 text-warning-foreground"
            : "border-primary/20 bg-primary/10 text-primary";
  return <Badge variant="outline" className={className}>{status}</Badge>;
}