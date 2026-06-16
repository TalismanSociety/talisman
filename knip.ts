import type { KnipConfig } from "knip"

const config: KnipConfig = {
  // Exclude exports tagged with @knipignore from unused reports
  tags: ["-knipignore"],

  ignoreWorkspaces: [
    ".papi/descriptors", // Generated polkadot-api descriptors
    "apps/balances-bench", // Test project — unused artefacts expected
  ],

  ignoreDependencies: [
    // Loaded via @plugin directive in CSS (knip can't parse CSS imports)
    "@tailwindcss/forms",
    // Core framework — referenced via @tailwindcss/postcss, not direct JS imports
    "tailwindcss",
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
        "entrypoints/popup/index.html",
        "entrypoints/dashboard/index.html",
        "entrypoints/onboarding/index.html",
        "entrypoints/support/index.html",
        "i18next-parser.config.cjs",
      ],
      project: ["src/**/*.{ts,tsx}", "entrypoints/**/*.{ts,tsx}"],
      ignore: ["**/*.spec.ts", "**/__tests__/**"],
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
