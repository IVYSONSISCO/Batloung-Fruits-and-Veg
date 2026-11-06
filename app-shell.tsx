import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Apple, BarChart3, Boxes, LayoutDashboard, Leaf, LogOut, PackagePlus, ShoppingCart, Store, Truck } from "lucide-react";
import { signOutUser } from "@/lib/api/auth.functions";
import { useCurrentStaff, useSignOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

const commonItems = [
  { title: "Dashboard", to: "/dashboard" as const, icon: LayoutDashboard },
  { title: "Street vendors", to: "/vendors" as const, icon: Store },
  { title: "Orders", to: "/orders" as const, icon: ShoppingCart },
  { title: "Reports", to: "/reports" as const, icon: BarChart3 },
];
const adminItems = [
  { title: "Fruits & products", to: "/products" as const, icon: Apple },
  { title: "Suppliers", to: "/suppliers" as const, icon: Truck },
  { title: "Purchases", to: "/purchases" as const, icon: PackagePlus },
];

function Navigation({ isAdmin }: { isAdmin: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const renderItem = (item: (typeof commonItems)[number] | (typeof adminItems)[number]) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton asChild isActive={pathname === item.to} tooltip={item.title}>
        <Link to={item.to} className="flex items-center gap-2">
          <item.icon className="size-4" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Operations</SidebarGroupLabel>
        <SidebarGroupContent><SidebarMenu>{commonItems.filter((i) => isAdmin || i.to === "/dashboard" || i.to === "/orders" || i.to === "/vendors").map(renderItem)}</SidebarMenu></SidebarGroupContent>
      </SidebarGroup>
      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel>Supply</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{adminItems.map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const staff = useCurrentStaff();
  const clearSession = useSignOut();
  const navigate = useNavigate();
  async function signOut() {
    const token = staff.token;
    await clearSession();
    if (token) {
      try {
        await signOutUser({ data: { token } });
      } catch {
        // Local session is already cleared; ignore server-side failures.
      }
    }
    navigate({ to: "/auth", replace: true });
  }
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border p-3">
            <Link to="/dashboard" className="flex h-10 items-center gap-3 overflow-hidden px-1 text-sidebar-foreground">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Leaf className="size-5" /></div>
              <div className="min-w-0"><p className="truncate font-display text-sm font-semibold">Batloung Fruits</p><p className="truncate text-xs opacity-70">Distribution</p></div>
            </Link>
          </SidebarHeader>
          <SidebarContent><Navigation isAdmin={staff.isAdmin} /></SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold">{(staff.fullName || "S").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{staff.fullName || "Staff member"}</p><p className="truncate text-xs opacity-65">{staff.isAdmin ? "Administrator" : "Sales"}</p></div>
              <Button variant="ghost" size="icon" onClick={signOut} className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" title="Sign out"><LogOut className="size-4" /><span className="sr-only">Sign out</span></Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger />
            <div className="h-5 w-px bg-border" />
            <Boxes className="size-4 text-primary" />
            <p className="text-sm font-medium">Distribution Management</p>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">{children}</div></main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}