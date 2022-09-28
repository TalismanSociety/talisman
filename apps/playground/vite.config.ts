import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  esbuild: {
    logOverride: {
      // spams warnings because ui library doesn't define import.meta
      "empty-import-meta": "silent",
    },
  },
})
