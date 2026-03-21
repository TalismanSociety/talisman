import type { KnipConfig } from "knip"

const config: KnipConfig = {
  // Exclude exports tagged with @knipignore from unused reports
  tags: ["-knipignore"],

  ignoreWorkspaces: [
    ".papi/descriptors", // Generated polkadot-api descriptors
    "apps/balances-bench", // Test project — unused artefacts expected
  ],

  ignore: ["**/dist/**", "**/.wxt/**", "**/coverage/**", "test-results/**", "playwright-report/**"],

  ignoreDependencies: [
    // Generated workspace package — imported via type-only paths by packages/balances and packages/sapi
    "@polkadot-api/descriptors",
  ],

  // Shell utilities used in package.json scripts — not npm binaries
  ignoreBinaries: ["lsof", "wait"],

  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },

  // Spec-defined constant sets and generated API clients — all exports are intentional
  ignoreIssues: {
    "**/EthProviderRpcError.ts": ["exports"],
    "**/Sign/Qr/constants.ts": ["exports"],
    "**/inject/solana/solana.ts": ["exports"],
    // Generated API clients export everything by design
    "**/bittensor/sn45/Sn45Api.ts": ["exports", "types"],
    "**/bittensor/tao-data/TaoDataApi.ts": ["exports", "types"],
    "**/app/remote-config/RemoteConfigApi.ts": ["exports", "types"],
  },

  workspaces: {
    ".": {},

    // Browser extension app (WXT — no native Knip plugin, needs manual entry config)
    "apps/extension": {
      entry: [
        "entrypoints/background.ts",
        "entrypoints/content.ts",
        "entrypoints/page.ts",

        "entrypoints/popup/index.html",
        "entrypoints/popup/main.tsx",
        "entrypoints/dashboard/index.html",
        "entrypoints/dashboard/main.tsx",
        "entrypoints/onboarding/index.html",
        "entrypoints/onboarding/main.tsx",
        "entrypoints/support/index.html",
        "entrypoints/support/main.tsx",

        "wxt.config.ts",
        "i18next-parser.config.cjs",
      ],
      project: ["src/**/*.{ts,tsx}", "entrypoints/**/*.{ts,tsx}"],
      ignore: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**", "tests/**"],
    },

    "config/tsconfig": {
      entry: ["*.json"],
      project: ["**/*.json"],
    },
  },

  playwright: {
    entry: ["playwright/e2e-tests/**/*.spec.ts"],
  },
}

export default config
