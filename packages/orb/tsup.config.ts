import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
      // tsup hardcodes baseUrl:"." into the dts build (not from our tsconfig); TS6 rejects it
      // as TS5101. Silence until tsup drops the injection or we migrate to tsdown (forced at TS7).
      ignoreDeprecations: "6.0",
    },
  },
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom"],
})
