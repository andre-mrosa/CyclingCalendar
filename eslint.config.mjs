import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".qa-tools/**",
    "_legacy_backup/**",
    "*.js",
    "*.mjs",
    "!next.config.js",
    "!proxy.js",
    "!postcss.config.js",
    "!tailwind.config.js",
    "!eslint.config.mjs",
    "qa-*",
    "app/.well-known/**",
    "public/sw.js",
    "public/workbox-*.js",
    "public/swe-worker-*.js",
    "public/fallback-*.js",
    "app/generated/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
