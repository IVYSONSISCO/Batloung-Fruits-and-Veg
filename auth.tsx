import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Leaf, Loader2 } from "lucide-react";

import { loginUser, registerUser } from "@/lib/api/auth.functions";
import { getStoredToken, setStoredToken } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In | Batloung Fruits Distribution" },
      {
        name: "description",
        content:
          "Sign in to the Batloung Fruits Distribution Management System to manage stock, suppliers, vendors and orders.",
      },
      { property: "og:title", content: "Staff Sign In | Batloung Fruits Distribution" },
      {
        property: "og:description",
        content: "Secure staff access to the Batloung Fruits distribution system in Maseru.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (getStoredToken()) navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  function validate(withName: boolean) {
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next["email"] = "Enter a valid email address";
    if (password.length < 6) next["password"] = "Password must be at least 6 characters";
    if (withName && fullName.trim().length < 2) next["fullName"] = "Enter your full name";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(false)) return;
    setBusy(true);
    try {
      const { token } = await loginUser({ data: { email, password } });
      setStoredToken(token);
      toast.success("Welcome back");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(true)) return;
    setBusy(true);
    try {
      const { token } = await registerUser({ data: { fullName: fullName.trim(), email, password } });
      setStoredToken(token);
      toast.success("Account created");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Leaf className="h-6 w-6" />
          Batloung Fruits
        </Link>
        <div className="space-y-4">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            Distribution management for Maseru&rsquo;s fruit trade
          </h1>
          <p className="max-w-md text-sm opacity-85">
            Track stock by fruit and box size, record supplier purchases by South African
            province, register street vendors and process orders from Pending through to
            Completed.
          </p>
        </div>
        <div aria-hidden="true" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
              <Leaf className="h-6 w-6 text-primary" />
              Batloung Fruits
            </Link>
          </div>
          <h2 className="font-display text-2xl font-semibold">Staff access</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Sign in to continue to the management system.
          </p>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors["email"]}
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors["password"]}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <Field
                  id="fullName"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  error={errors["fullName"]}
                />
                <Field
                  id="email2"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors["email"]}
                />
                <Field
                  id="password2"
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  error={errors["password"]}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
                <p className="text-xs text-muted-foreground">
                  The first six accounts become Administrators. Every account after that is a
                  Sales user.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
