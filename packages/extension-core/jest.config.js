/* eslint-env es2022 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
const { defaults } = require("jest-config")

module.exports = {
  transformIgnorePatterns: [
    "/node_modules/.pnpm/(?!@polkadot|@substrate|@azns|@babel/runtime/helpers/esm/|@metamask|url-join|isows|nanoid|@talismn|scale-ts)",
  ],
  transform: {
    "^.+\\.(t|j)s$": ["@swc/jest"],
  },
  moduleNameMapper: {
    "^rxjs/internal/(.*)$": "rxjs/dist/cjs/internal/$1",
    "uuid": require.resolve("uuid"),
    "dexie": require.resolve("dexie"),
  },
  sandboxInjectedGlobals: ["Math"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "mjs"],
  setupFiles: [
    "jest-webextension-mock",
    "fake-indexeddb/auto",
    "jest-fetch-mock/setupJest",
    "<rootDir>/tests/setup",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/mocks/index.ts"],
  testEnvironment: "jsdom",
}
