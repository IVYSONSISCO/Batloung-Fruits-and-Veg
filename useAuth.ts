import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/auth.functions";

const TOKEN_KEY = "batloung_session_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export type AppRole = "admin" | "sales";

/** Reads the signed-in staff member's profile and role from the database. */
export function useCurrentStaff() {
  const [token] = useState(getStoredToken);

  const query = useQuery({
    queryKey: ["current-staff", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      if (!token) throw new Error("You must be signed in");
      return await getCurrentUser({ data: { token } });
    },
  });

  return {
    loading: !!token && query.isLoading,
    token,
    id: query.data?.id,
    role: (query.data?.role ?? "sales") as AppRole,
    isAdmin: query.data?.role === "admin",
    fullName: query.data?.fullName ?? "",
    email: query.data?.email ?? "",
  };
}

/** Clears the local session and any cached staff/data queries. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    setStoredToken(null);
  };
}
