import { defineConfig } from "@playwright/test";

// Runs against production builds: run `pnpm build` with NEXT_PUBLIC_API_URL=http://localhost:4100 first.
// Uses the installed Chrome, so no separate browser download is needed.
// Ports 3100 and 4100 keep the tests clear of running dev servers on 3000 and 4000.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://localhost:3100", channel: "chrome" },
  webServer: [
    {
      command: "pnpm --filter @skillprove/api exec next start -p 4100",
      url: "http://localhost:4100/api/v1/health",
      reuseExistingServer: false,
      env: { CORS_ALLOWED_ORIGINS: "http://localhost:3100", DATABASE_URL: "" },
    },
    {
      command: "pnpm exec next start -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      // The internal design system page is off in production unless the server enables it.
      env: { SKILLPROVE_DESIGN_SYSTEM: "enabled" },
    },
  ],
});
