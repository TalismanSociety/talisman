import type { KnipConfig } from "knip"

const config: KnipConfig = {
  // Exclude exports tagged with @knipignore from unused reports
  tags: ["-knipignore"],

  ignoreWorkspaces: [
    ".papi/descriptors", // Generated polkadot-api descriptors
    "apps/balances-bench", // Test project — unused artefacts expected
    "config/tsconfig", // Ships only shared tsconfig .json files — no code for knip to analyze
  ],

  ignoreDependencies: [
    // Generated workspace package (.papi/descriptors); provided to packages/{balances,sapi} via the
    // root/extension declaration + shamefullyHoist, so they import it without declaring it directly
    "@polkadot-api/descriptors",
  ],

  // Shell utilities used in package.json scripts — not npm binaries
  ignoreBinaries: ["wait"],

  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },

  // Spec-defined constant sets and generated API clients — all exports are intentional
  ignoreIssues: {
    "**/EthProviderRpcError.ts": ["exports"],
    "**/Sign/Qr/constants.ts": ["exports"],
    "**/inject/solana/solana.ts": ["exports"],
    // Public injected web3 API types exposed to dapps (mirror @polkadot/extension-inject)
    "**/inject/substrate/types.ts": ["types"],
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
        "i18next.config.ts",
        "scripts/i18nextTransDefaults.ts",
      ],
      project: ["src/**/*.{ts,tsx,css}", "entrypoints/**/*.{ts,tsx}"],
      ignore: ["**/*.spec.ts", "**/__tests__/**"],
    },
  },

  playwright: {
    entry: ["playwright/e2e-tests/**/*.spec.ts"],
  },
}

export default config
