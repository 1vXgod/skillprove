import tseslint from "typescript-eslint";

/** Shared flat config for TypeScript code across the monorepo. */
export const baseConfig = tseslint.config(
  { ignores: ["**/.next/**", "**/.expo/**", "**/dist/**", "**/src/generated/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
