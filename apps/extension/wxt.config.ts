import { execSync } from "node:child_process"
import { resolve } from "node:path"

import type { Alias } from "vite"
import replace from "@rollup/plugin-replace"
import react from "@vitejs/plugin-react"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import svgr from "vite-plugin-svgr"
import { defineConfig } from "wxt"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json")

// Get git SHA for build identification (used in zip filename)
// Prefer COMMIT_SHA_SHORT env var (from CI), otherwise get it from git
function getGitSha(): string {
  if (process.env.COMMIT_SHA_SHORT) {
    return process.env.COMMIT_SHA_SHORT
  }
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch {
    return "unknown"
  }
}

// Resolve monorepo packages to their source directories for hot reload
const packagesDir = resolve(__dirname, "../../packages")

// Create aliases to map @talismn/* packages to their source directories
// This enables hot reload in dev mode - changes to package source are reflected immediately
function createPackageSourceAliases(): Alias[] {
  return [
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
  ]
}

export default defineConfig({
  // Project root directory
  root: __dirname,

  // Source directory relative to root (entrypoints are at project root)
  srcDir: ".",

  // Entrypoints directory at project root
  entrypointsDir: "entrypoints",

  // Output directory - WXT appends browser name (e.g., dist/chrome-mv3)
  outDir: "dist",

  // Dev server configuration
  dev: {
    server: {
      port: 3000,
    },
    // Persist browser profile between restarts (keeps extension storage, logins, etc.)
    reloadCommand: "Alt+R",
  },

  // Runner configuration - persist browser data directory
  runner: {
    chromiumProfile: ".wxt/chrome-data",
    keepProfileChanges: true,
  },

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

      // CSP - Chrome MV3 doesn't allow 'unsafe-eval', only 'wasm-unsafe-eval'
      // Firefox MV2 is more permissive but we use the same CSP for simplicity
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
                strict_min_version: "128.0",
                id: "{f5727e03-b26c-41e0-95dd-7e315ff16410}",
              },
            },
          }
        : {
            // ES module service workers require Chrome 121+
            minimum_chrome_version: "121",
          }),
    }
  },

  // Vite configuration
  // In dev mode: alias packages to source for hot reload
  // In production: use pre-built tsup outputs from dist/ for smaller bundles
  vite: ({ mode, browser }) => {
    const isDev = mode === "development"
    // WXT passes browser via the ConfigEnv parameter (e.g., "firefox", "chrome")
    const isFirefox = browser === "firefox"

    // Helper function to transform chrome.* to browser.* for Firefox
    // Used by both transform (dev) and renderChunk (production) hooks
    const transformChromeToBrowser = (code: string): { code: string; map: null } | null => {
      let result = code

      // Replace common chrome.* API namespaces with browser.*
      // Use word boundaries to avoid partial matches
      const chromeApis = [
        "storage",
        "runtime",
        "tabs",
        "windows",
        "notifications",
        "alarms",
        "browserAction",
        "action",
        "permissions",
        "webRequest",
        "scripting",
        "management",
        "contextMenus",
        "commands",
        "cookies",
        "downloads",
        "history",
        "bookmarks",
        "identity",
        "i18n",
        "idle",
        "extension",
      ]

      for (const api of chromeApis) {
        // Match chrome.api (but not .chrome.api or _chrome.api)
        const dotPattern = new RegExp(`\\bchrome\\.${api}\\b`, "g")
        result = result.replace(dotPattern, `browser.${api}`)

        // Also handle bracket notation: chrome["storage"], chrome['storage']
        const bracketPattern = new RegExp(`\\bchrome\\s*\\[\\s*['"]${api}['"]\\s*\\]`, "g")
        result = result.replace(bracketPattern, `browser["${api}"]`)
      }

      // Remove WXT's "const browser = browser$N" to avoid TDZ conflict
      // Our banner already defines "var browser = globalThis.browser" at the top
      result = result.replace(
        /const browser = browser\$\d+;/g,
        "// const browser = browser$N; // Removed to avoid TDZ - using var browser from banner",
      )

      // Only return if we made changes
      if (result !== code) {
        return { code: result, map: null }
      }
      return null
    }

    // Base aliases always needed (internal extension paths)
    const baseAliases: Alias[] = [
      // Internal path aliases (from tsconfig.json with baseUrl: "src")
      { find: "@common", replacement: resolve(__dirname, "src/common") },
      { find: "@talisman", replacement: resolve(__dirname, "src/@talisman") },
      { find: "@ui", replacement: resolve(__dirname, "src/ui") },
      { find: "@tests", replacement: resolve(__dirname, "src/tests") },
      // Base-relative imports from src/
      { find: /^inject\/(.*)$/, replacement: resolve(__dirname, "src/inject/$1") },
    ]

    // In dev mode, add package source aliases for hot reload
    // In production, packages resolve normally to their dist/ outputs via pnpm workspace
    const aliases = isDev ? [...baseAliases, ...createPackageSourceAliases()] : baseAliases

    return {
      plugins: [
        // Replace environment variables in all code including bundled dependencies
        // This handles cases where variable names get mangled (e.g., process$1.env)
        replace({
          preventAssignment: true,
          values: {
            "process.env.VERSION": JSON.stringify(pkg.version),
            "process.env.EXTENSION_PREFIX": JSON.stringify("talisman"),
            "process.env['EXTENSION_PREFIX']": JSON.stringify("talisman"),
            "process.env.PORT_PREFIX": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
            "process.env['PORT_PREFIX']": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
            "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || ""),
            "process.env.BUILD": JSON.stringify(isDev ? "dev" : "production"),
            "process.env.RELEASE": JSON.stringify(`talisman-wallet@${pkg.version}`),
            "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN || ""),
            "process.env.SUPPORTED_LANGUAGES": JSON.stringify(
              process.env.SUPPORTED_LANGUAGES || "",
            ),
            "process.env.PASSWORD": JSON.stringify(process.env.PASSWORD || ""),
            "process.env.EVM_LOGPROXY": JSON.stringify(process.env.EVM_LOGPROXY || ""),
            "process.env.LOG_SUBSCRIPTION_CALLBACKS": JSON.stringify(
              process.env.LOG_SUBSCRIPTION_CALLBACKS || "",
            ),
          },
        }),
        // Node.js polyfills for browser compatibility (buffer, crypto, etc.)
        nodePolyfills({
          include: ["buffer", "crypto", "stream", "util", "process"],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
        react(),
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
        // Replace environment variables in final chunks (handles mangled variable names)
        {
          name: "env-replace-final",
          enforce: "post" as const,
          renderChunk(code: string, chunk: { fileName: string }) {
            // Only process background.js where the polkadot env vars are needed
            if (chunk.fileName.includes("background")) {
              // Replace patterns like process$1$1.env['EXTENSION_PREFIX'] or process.env['EXTENSION_PREFIX']
              let result = code
              result = result.replace(
                /process(?:\$\d+)*\.env\s*\[\s*['"]EXTENSION_PREFIX['"]\s*\]/g,
                JSON.stringify("talisman"),
              )
              result = result.replace(
                /process(?:\$\d+)*\.env\s*\[\s*['"]PORT_PREFIX['"]\s*\]/g,
                JSON.stringify("talisman"),
              )
              return { code: result, map: null }
            }
            return null
          },
        },
        // Firefox: Replace chrome.* with browser.* in both dev and production
        // In Firefox MV2, the 'browser' API provides Promise-based methods,
        // while 'chrome' uses callbacks. Since the codebase uses 'chrome.*' directly,
        // we transform the code to use 'browser' instead.
        ...(isFirefox
          ? [
              {
                name: "firefox-chrome-to-browser",
                enforce: "post" as const,
                // Use transform hook for dev mode (serves files directly)
                transform(code: string, id: string) {
                  // Only transform JS/TS files from our source
                  // Use a more flexible pattern that handles query strings
                  if (!id.match(/\.(js|ts|tsx|jsx)(\?|$)/)) return null
                  // Skip node_modules (they shouldn't use chrome.* directly)
                  if (id.includes("node_modules")) return null

                  // Only transform if the file uses chrome.* APIs
                  if (!code.includes("chrome.")) return null

                  return transformChromeToBrowser(code)
                },
                // Use renderChunk hook for production builds
                renderChunk(code: string, chunk: { fileName: string }) {
                  // Only transform JS files
                  if (!chunk.fileName.endsWith(".js")) return null

                  return transformChromeToBrowser(code)
                },
              },
            ]
          : []),
      ],

      resolve: {
        alias: aliases,
      },

      // Define environment variables
      // Note: @polkadot/extension-base uses bracket notation like process.env['PORT_PREFIX']
      define: {
        "process.env.VERSION": JSON.stringify(pkg.version),
        "process.env.EXTENSION_PREFIX": JSON.stringify("talisman"),
        "process.env['EXTENSION_PREFIX']": JSON.stringify("talisman"),
        "process.env.PORT_PREFIX": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
        "process.env['PORT_PREFIX']": JSON.stringify(process.env.PORT_PREFIX || "talisman"),
        "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG || ""),
        "process.env.BUILD": JSON.stringify(isDev ? "dev" : "production"),
        "process.env.RELEASE": JSON.stringify(`talisman-wallet@${pkg.version}`),
        "process.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN || ""),
        "process.env.SUPPORTED_LANGUAGES": JSON.stringify(process.env.SUPPORTED_LANGUAGES || ""),
        "process.env.PASSWORD": JSON.stringify(process.env.PASSWORD || ""),
        "process.env.EVM_LOGPROXY": JSON.stringify(process.env.EVM_LOGPROXY || ""),
        "process.env.LOG_SUBSCRIPTION_CALLBACKS": JSON.stringify(
          process.env.LOG_SUBSCRIPTION_CALLBACKS || "",
        ),
      },

      optimizeDeps: {
        include: ["react", "react-dom", "rxjs"],
      },

      build: {
        // Target modern browsers
        target: "esnext",

        // Chunk size warnings (4MB is the store limit, warn at 3.5MB to leave margin)
        chunkSizeWarningLimit: 3500,

        rollupOptions: {
          // Suppress noisy warnings from node_modules
          onwarn(warning, warn) {
            // Ignore PURE comment warnings from @polkadot and mlkem packages
            if (warning.code === "INVALID_ANNOTATION" && warning.message.includes("__PURE__")) {
              return
            }
            // Ignore eval warnings from store package
            if (warning.code === "EVAL" && warning.id?.includes("node_modules")) {
              return
            }
            warn(warning)
          },
          output: {
            // Add shims for service worker (background script)
            // Some packages like @polkadot/util reference document which doesn't exist in service workers
            // For Firefox, we also need to set up 'browser' before any code runs
            banner: (chunk) => {
              if (chunk.fileName === "background.js" || chunk.name === "background") {
                // Firefox MV2: Create 'browser' var from globalThis.browser BEFORE any code runs
                // This avoids TDZ issues with const browser declarations from polyfills
                const firefoxShim = isFirefox
                  ? `
// Firefox browser API shim - must be var (not const) to avoid TDZ issues
// Firefox MV2 provides globalThis.browser with Promise-based APIs
var browser = globalThis.browser;
`
                  : ""

                return `${firefoxShim}
// Document shim for service worker - some packages reference document which doesn't exist
if (typeof document === "undefined") {
  globalThis.document = { baseURI: self.location.href, currentScript: null };
}
`
              }
              return ""
            },
          },
        },
      },

      // Enable WASM
      worker: {
        format: "es",
      },
    }
  },

  // WXT-specific options
  imports: false, // Disable auto-imports for explicit control

  // Zip configuration for build artifacts
  zip: {
    // Include git SHA in zip filename for build identification
    // Format: talisman-1.2.3-abc1234-chrome.zip
    artifactTemplate: `talisman-{{version}}-${getGitSha()}-{{browser}}.zip`,
    sourcesTemplate: `talisman-{{version}}-${getGitSha()}-sources.zip`,
  },
})
