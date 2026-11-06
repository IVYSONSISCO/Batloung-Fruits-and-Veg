import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/lib/api/dashboard.functions";
import { useCurrentStaff } from "@/hooks/useAuth";
import { AppShell } from "@/components/management/app-shell";
import { Metric, PageHeader } from "@/components/management/page";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Batloung Fruits" },
      { name: "description", content: "Overview of stock, vendors and orders at Batloung Fruits." },
      { property: "og:title", content: "Dashboard | Batloung Fruits" },
      { property: "og:description", content: "Overview of stock, vendors and orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const staff = useCurrentStaff();
  const { data } = useQuery({
    queryKey: ["summary", staff.token],
    queryFn: () => fetchDashboardSummary({ data: { token: staff.token ?? "" } }),
  });

  const cards = [
    ["Fruits", data?.fruits],
    ["Suppliers", data?.suppliers],
    ["Vendors", data?.vendors],
    ["Boxes in stock", data?.stock],
    ["Total orders", data?.orders],
    ["Pending", data?.pending],
    ["Completed", data?.completed],
    ["Sales (M)", data?.sales?.toFixed(2)],
  ];

  const statusData = ["Pending", "Confirmed", "Processing", "Ready", "Completed"].map((status) => ({
    status,
    orders: data?.statusRows.filter((item) => item.status === status).length ?? 0,
  }));

  return (
    <AppShell>
      <PageHeader title="Dashboard" description={`Welcome, ${staff.fullName || "staff member"}. Here is today’s distribution overview.`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <Metric key={label as string} label={label as string} value={value ?? "—"} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card p-5">
          <h2 className="mb-5 font-display text-lg font-semibold">Order pipeline</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="orders" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="surface-card p-5">
          <h2 className="font-display text-lg font-semibold">Stock health</h2>
          <p className="mt-2 text-sm text-muted-foreground">Boxes currently available for vendor orders.</p>
          <p className="mt-8 font-display text-5xl font-semibold text-primary">{data?.stock ?? "—"}</p>
          <p className="mt-2 text-sm text-muted-foreground">across {data?.fruits ?? 0} fruit varieties</p>
        </div>
      </div>
    </AppShell>
  );
}
