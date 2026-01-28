import dns from "node:dns"
import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import svgr from "vite-plugin-svgr"

// without this dns trick, link provided in terminal will be http://127.0.0.1:3000
// and wallets won't be injected in the page
dns.setDefaultResultOrder("verbatim")

// Resolve monorepo packages to their source directories for hot reload
const packagesDir = resolve(__dirname, "../../packages")

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
  },
  plugins: [
    react(),
    svgr(),
    nodePolyfills({
      include: ["buffer"],
      globals: { Buffer: true },
    }),
  ],
  resolve: {
    alias: {
      // Map workspace packages to source for hot reload in dev
      "@talismn/balances": resolve(packagesDir, "balances/src"),
      "@talismn/balances-react": resolve(packagesDir, "balances-react/src"),
      "@talismn/chain-connectors": resolve(packagesDir, "chain-connectors/src"),
      "@talismn/chaindata-provider": resolve(packagesDir, "chaindata-provider/src"),
      "@talismn/connection-meta": resolve(packagesDir, "connection-meta/src"),
      "@talismn/token-rates": resolve(packagesDir, "token-rates/src"),
      "@talismn/util": resolve(packagesDir, "util/src"),
    },
  },
  esbuild: {
    logOverride: {
      // spams warnings because ui library doesn't define import.meta
      "empty-import-meta": "silent",
    },
  },
})
