import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Database-backed route tests share one test database. The local PGlite server used without
    // Docker serves a single connection, so files run one after another to stay reliable there.
    fileParallelism: false,
  },
});
