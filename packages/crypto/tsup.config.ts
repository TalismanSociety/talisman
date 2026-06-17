import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
      ignoreDeprecations: "6.0",
    },
  },
  sourcemap: true,
  clean: true,
  target: "es2022",
  splitting: false,
})
