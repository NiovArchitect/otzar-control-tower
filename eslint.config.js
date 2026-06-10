// FILE: eslint.config.js
// PURPOSE: Flat ESLint config (ESLint 9+) for the Otzar Control
//          Tower frontend. Mirrors the reference repo's setup with
//          additions for the test files and stricter unused-vars
//          handling that matches Foundation's discipline.
// CONNECTS TO: package.json `npm run lint`.

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "playwright-report",
      "test-results",
      // Rust/Tauri build artifacts — generated, not source.
      "src-tauri/target",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // shadcn/ui primitives intentionally co-export a component plus
    // its cva-derived variants helper. Disable the fast-refresh
    // warning here -- standard shadcn pattern.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
