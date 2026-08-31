import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively (Vite 7+).
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    // Integration tests that hit the real Supabase project run separately
    // via `npm run test:rls` — they need network and secrets, and must not
    // slow down or flake the fast unit loop.
    exclude: ["**/node_modules/**", "src/**/*.rls.test.ts"],
  },
});
