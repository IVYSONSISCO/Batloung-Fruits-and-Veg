import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Use src/server.ts (our SSR error wrapper) as the server entry
      // instead of TanStack Start's default bundled entry.
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
