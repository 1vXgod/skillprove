import { defineConfig } from "vitest/config";

// One file at a time: the seed test counts shared reference data.
export default defineConfig({ test: { fileParallelism: false } });
