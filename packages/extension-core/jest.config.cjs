/* eslint-env es2022 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
const path = require("path")
const { defaults } = require("jest-config")

// Resolve workspace packages to their source directories for testing
const packagesDir = path.resolve(__dirname, "..")

module.exports = {
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
  moduleNameMapper: {
    "^rxjs/internal/(.*)$": "rxjs/dist/cjs/internal/$1",
    "uuid": require.resolve("uuid"),
    "dexie": require.resolve("dexie"),
    // Map workspace package internal paths to source
    "^@talismn/([^/]+)/src/(.*)$": `${packagesDir}/$1/src/$2`,
  },
  sandboxInjectedGlobals: ["Math"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "mjs"],
  setupFiles: [
    "jest-webextension-mock",
    "jest-fetch-mock/setupJest",
    "fake-indexeddb/auto",
    "<rootDir>/tests/setup",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/mocks/index.ts"],
  testEnvironment: "<rootDir>/tests/env.js",
}
