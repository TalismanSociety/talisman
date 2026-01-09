import svgr from "esbuild-plugin-svgr"
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // Skip DTS for SVG components - types are inferred from React
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom"],
  esbuildPlugins: [
    svgr({
      exportType: "named",
      namedExport: "ReactComponent",
    }),
  ],
})
