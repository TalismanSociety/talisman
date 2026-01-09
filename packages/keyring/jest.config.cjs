const path = require("path")

// Resolve workspace packages to their dist directories for testing
const packagesDir = path.resolve(__dirname, "..")

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
  moduleNameMapper: {
    // Map workspace packages to their dist (after tsup build)
    "^@talismn/([^/]+)$": `${packagesDir}/$1/dist/index.js`,
  },
  setupFiles: ["<rootDir>/tests/setup.ts"],
}
