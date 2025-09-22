/* eslint-env es2022 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
const { defaults } = require("jest-config")

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
