import { defineConfig } from "vitest/config";

/**
 * Integration tests that hit the real Supabase project.
 *
 * Kept separate from the unit suite (vitest.config.mts) on purpose: these are
 * slow, need network, and can fail for reasons unrelated to the code. A network
 * blip must never block the fast feedback loop.
 *
 * See docs/decisions/0003-rls-tests-against-remote.md.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["./vitest.rls.setup.ts"],
    globals: true,
    include: ["src/**/*.{rls,integration}.test.ts"],
    // Signing in, writing and cleaning up over the network is not instant.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // These tests share one remote database; running files in parallel would
    // let them clobber each other's fixture rows.
    fileParallelism: false,
  },
});
