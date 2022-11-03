import dns from "dns"

import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import svgr from "vite-plugin-svgr"

// without this dns trick, link provided in terminal will be http://127.0.0.1:3000
// and wallets won't be injected in the page
dns.setDefaultResultOrder("verbatim")

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "localhost",
  },
  plugins: [react(), svgr()],
  esbuild: {
    logOverride: {
      // spams warnings because ui library doesn't define import.meta
      "empty-import-meta": "silent",
    },
  },
  // allows using buffer
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: "globalThis",
      },
      // Enable esbuild polyfill plugins
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
})
