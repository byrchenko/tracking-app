import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      // The app is phone-first; the e2e path should exercise it that way.
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  // Reuse an already-running dev server locally; always build fresh in CI.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
