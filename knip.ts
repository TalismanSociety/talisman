import type { KnipConfig } from "knip"

const config: KnipConfig = {
  // Ignore generated polkadot-api descriptors workspace
  ignoreWorkspaces: [".papi/descriptors"],

  // Global ignore patterns for build artifacts and generated files
  ignore: ["**/dist/**", "**/.wxt/**", "**/coverage/**", "test-results/**", "playwright-report/**"],

  // Treat interface/type exports as used if file is used (common pattern in TS)
  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },

  // Workspace-specific configurations
  workspaces: {
    // Root workspace - only shell scripts exist
    ".": {},

    // Browser extension app (WXT - no native Knip plugin, needs manual entry config)
    "apps/extension": {
      // WXT entrypoints - must be configured manually
      entry: [
        // Main WXT entrypoints
        "entrypoints/background.ts",
        "entrypoints/content.ts",
        "entrypoints/page.ts",

        // HTML entrypoints for UI pages
        "entrypoints/popup/index.html",
        "entrypoints/popup/main.tsx",
        "entrypoints/dashboard/index.html",
        "entrypoints/dashboard/main.tsx",
        "entrypoints/onboarding/index.html",
        "entrypoints/onboarding/main.tsx",
        "entrypoints/support/index.html",
        "entrypoints/support/main.tsx",

        // Config files
        "wxt.config.ts",
        "i18next-parser.config.cjs",
      ],
      project: ["src/**/*.{ts,tsx}", "entrypoints/**/*.{ts,tsx}"],
      ignore: ["**/*.test.ts", "**/*.spec.ts", "tests/**"],
    },

    // Balances demo app
    "apps/balances-demo": {
      entry: ["src/main.tsx"],
      project: ["src/**/*.{ts,tsx}"],
    },

    // Balances bench app - multiple entry scripts, no single index
    "apps/balances-bench": {
      entry: ["src/*.ts"],
      project: ["src/**/*.ts"],
    },

    // ESLint config package - Knip's ESLint plugin handles this
    "config/eslint-config": {},

    // TSConfig package - JSON files, not really code
    "config/tsconfig": {
      entry: ["*.json"],
      project: ["**/*.json"],
    },
  },

  // Plugin configurations
  playwright: {
    entry: ["playwright/e2e-tests/**/*.spec.ts"],
  },
}

export default config
