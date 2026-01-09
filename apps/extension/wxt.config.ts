import { resolve } from "node:path"

import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import { defineConfig } from "wxt"

// Resolve monorepo packages to their source directories for hot reload
const packagesDir = resolve(__dirname, "../../packages")

export default defineConfig({
  // Project root directory
  root: __dirname,

  // Source directory relative to root (entrypoints are at project root)
  srcDir: ".",

  // Entrypoints directory at project root
  entrypointsDir: "entrypoints",

  // Output directory (use .output for dev, dist for prod)
  outDir: ".output",

  // Manifest configuration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  manifest: ({ browser, manifestVersion, mode, command }) => {
    // Pick the right icon suffix based on mode (dev vs prod/canary)
    const iconSuffix = mode === "development" ? "-dev" : "-prod"

    return {
      name: "Talisman Wallet",
      description:
        "The self-custody wallet for the next era of DeFi. One unified portfolio for Ethereum, Solana, Bittensor, Polkadot, and more.",
      author: "Talisman",

      permissions: ["storage", "tabs", "notifications", "alarms"],

      icons: {
        16: `/favicon16x16${iconSuffix}.png`,
        24: `/favicon24x24${iconSuffix}.png`,
        32: `/favicon32x32${iconSuffix}.png`,
        48: `/favicon48x48${iconSuffix}.png`,
        64: `/favicon64x64${iconSuffix}.png`,
        128: `/favicon128x128${iconSuffix}.png`,
      },

      action: {
        default_title: "Talisman",
        default_popup: "popup.html?embedded#/portfolio",
      },

      options_ui: {
        page: "dashboard.html#/settings/general",
        open_in_tab: true,
      },

      content_security_policy: {
        extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
      },

      web_accessible_resources: [
        {
          resources: ["page.js"],
          matches: ["file://*/*", "http://*/*", "https://*/*"],
        },
      ],

      // Browser-specific settings
      ...(browser === "firefox"
        ? {
            browser_specific_settings: {
              gecko: {
                strict_min_version: "109.0",
                id: "{f5727e03-b26c-41e0-95dd-7e315ff16410}",
              },
            },
          }
        : {
            minimum_chrome_version: "102",
          }),
    }
  },

  // Vite configuration
  vite: () => ({
    plugins: [
      react({
        babel: {
          plugins: ["@babel/plugin-transform-react-jsx"],
        },
      }),
      // Transform SVG imports to React components (equivalent to @svgr/webpack)
      svgr({
        include: "**/*.svg",
        svgrOptions: {
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
      // Handle .md files as raw text (equivalent to webpack's raw-loader)
      {
        name: "raw-md-loader",
        transform(code: string, id: string) {
          if (id.endsWith(".md")) {
            return {
              code: `export default ${JSON.stringify(code)}`,
              map: null,
            }
          }
        },
      },
    ],

    resolve: {
      alias: [
        // Internal path aliases (from tsconfig.json with baseUrl: "src")
        { find: "@common", replacement: resolve(__dirname, "src/common") },
        { find: "@talisman", replacement: resolve(__dirname, "src/@talisman") },
        { find: "@ui", replacement: resolve(__dirname, "src/ui") },
        { find: "@tests", replacement: resolve(__dirname, "src/tests") },
        // Base-relative imports from src/
        { find: /^inject\/(.*)$/, replacement: resolve(__dirname, "src/inject/$1") },

        // Internal packages - match subpath imports like "extension-core/background" or "talisman-ui/src/styles"
        {
          find: /^extension-core\/(.*)$/,
          replacement: resolve(packagesDir, "extension-core/src/$1"),
        },
        {
          find: /^extension-shared\/(.*)$/,
          replacement: resolve(packagesDir, "extension-shared/src/$1"),
        },
        {
          find: /^talisman-ui\/src\/(.*)$/,
          replacement: resolve(packagesDir, "talisman-ui/src/$1"),
        },
        { find: /^talisman-ui$/, replacement: resolve(packagesDir, "talisman-ui/src") },

        // Map workspace packages to source for hot reload in dev (exact matches)
        { find: "extension-core", replacement: resolve(packagesDir, "extension-core/src") },
        { find: "extension-shared", replacement: resolve(packagesDir, "extension-shared/src") },

        { find: "@talismn/balances", replacement: resolve(packagesDir, "balances/src") },
        {
          find: "@talismn/balances-react",
          replacement: resolve(packagesDir, "balances-react/src"),
        },
        {
          find: "@talismn/chain-connectors",
          replacement: resolve(packagesDir, "chain-connectors/src"),
        },
        {
          find: "@talismn/chaindata-provider",
          replacement: resolve(packagesDir, "chaindata-provider/src"),
        },
        {
          find: "@talismn/connection-meta",
          replacement: resolve(packagesDir, "connection-meta/src"),
        },
        { find: "@talismn/crypto", replacement: resolve(packagesDir, "crypto/src") },
        { find: "@talismn/icons", replacement: resolve(packagesDir, "icons/src") },
        { find: "@talismn/keyring", replacement: resolve(packagesDir, "keyring/src") },
        { find: "@talismn/on-chain-id", replacement: resolve(packagesDir, "on-chain-id/src") },
        { find: "@talismn/orb", replacement: resolve(packagesDir, "orb/src") },
        { find: "@talismn/sapi", replacement: resolve(packagesDir, "sapi/src") },
        { find: "@talismn/scale", replacement: resolve(packagesDir, "scale/src") },
        { find: "@talismn/solana", replacement: resolve(packagesDir, "solana/src") },
        { find: "@talismn/token-rates", replacement: resolve(packagesDir, "token-rates/src") },
        { find: "@talismn/util", replacement: resolve(packagesDir, "util/src") },
      ],
    },

    // Handle node polyfills
    define: {
      "process.env.EXTENSION_PREFIX": JSON.stringify(""),
      "process.env.PORT_PREFIX": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
      "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || ""),
    },

    optimizeDeps: {
      include: ["react", "react-dom", "rxjs"],
    },

    build: {
      // Target modern browsers
      target: "esnext",

      // Chunk size warnings
      chunkSizeWarningLimit: 4000,
    },

    // Enable WASM
    worker: {
      format: "es",
    },
  }),

  // WXT-specific options
  imports: false, // Disable auto-imports for explicit control
})
