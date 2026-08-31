import { existsSync } from "node:fs";

// Vite only exposes VITE_-prefixed variables, and these tests read process.env
// directly, so .env.local is loaded explicitly. CI supplies the same variables
// as secrets and has no .env.local file.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}
