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
    // Loaded via @plugin directive in CSS (knip can't parse CSS imports)
    "@tailwindcss/forms",
    // Core framework — referenced via @tailwindcss/postcss, not direct JS imports
    "tailwindcss",
    // Declared at the root so shamefullyHoist resolves the top-level copy to one that exports
    // `isResponse` (the papi CLI's json-rpc-provider-proxy phantom-imports it); not imported in source
    "@polkadot-api/json-rpc-provider",
    // Root-pinned to keep the ws-provider copy consumed by @talismn/chain-connectors deduped with
    // the one polkadot-api pulls transitively; imported in that package, not at the root
    "@polkadot-api/ws-provider",
    // Generated workspace package (.papi/descriptors); provided to packages/{balances,sapi} via the
    // root/extension declaration + shamefullyHoist, so they import it without declaring it directly
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
    // Public injected web3 API types exposed to dapps (mirror @polkadot/extension-inject)
    "**/inject/substrate/types.ts": ["types"],
    // Generated API clients export everything by design
    "**/bittensor/sn45/Sn45Api.ts": ["exports", "types"],
    "**/bittensor/tao-data/TaoDataApi.ts": ["exports", "types"],
    "**/app/remote-config/RemoteConfigApi.ts": ["exports", "types"],
    // Vendored upstream source kept verbatim (incl. its unused public API) for direct diffing
    "**/sapi/src/vendor/tx-utils/**": ["exports", "types"],
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
  },

  playwright: {
    entry: ["playwright/e2e-tests/**/*.spec.ts"],
  },
}

export default config
