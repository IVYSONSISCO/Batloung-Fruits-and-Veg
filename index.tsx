import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Batloung Fruits Distribution Management System" },
      { name: "description", content: "Stock, supplier, vendor and order management for Batloung Fruits, Maseru." },
      { property: "og:title", content: "Batloung Fruits Distribution Management System" },
      { property: "og:description", content: "Stock, supplier, vendor and order management for Batloung Fruits, Maseru." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="hero-gradient flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center text-primary-foreground">
      <h1 className="max-w-2xl text-4xl font-semibold md:text-5xl">Batloung Fruits Distribution</h1>
      <p className="max-w-lg opacity-85">
        Manage fruit stock, suppliers across South Africa, Maseru street vendors and orders in one place.
      </p>
      <Button asChild size="lg" variant="secondary">
        <Link to="/auth">Staff sign in</Link>
      </Button>
    </div>
  );
}
