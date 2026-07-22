import svgr from "@svgr/rollup"
import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Skip DTS for SVG components - types are inferred from React
  sourcemap: true,
  target: "es2022",
  external: ["react", "react-dom"],
  outExtensions: ({ format }) =>
    format === "cjs" ? { js: ".js", dts: ".d.ts" } : { js: ".mjs", dts: ".d.mts" },
  plugins: [
    svgr({
      exportType: "named",
      namedExport: "ReactComponent",
    }),
  ],
})
