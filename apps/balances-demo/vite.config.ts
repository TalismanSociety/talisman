import dns from "dns"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { nodePolyfills } from "vite-plugin-node-polyfills"
import svgr from "vite-plugin-svgr"

// without this dns trick, link provided in terminal will be http://127.0.0.1:3000
// and wallets won't be injected in the page
dns.setDefaultResultOrder("verbatim")

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
  esbuild: {
    logOverride: {
      // spams warnings because ui library doesn't define import.meta
      "empty-import-meta": "silent",
    },
  },
})
