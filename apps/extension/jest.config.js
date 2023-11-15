/* eslint-env es2022 */
/** @type {import('ts-jest').InitialOptionsTsJest} */
const { defaults } = require("jest-config")
const { pathsToModuleNameMapper } = require("ts-jest")
const { compilerOptions } = require("./tsconfig.json")

module.exports = {
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@substrate|@babel/runtime/helpers/esm/|@metamask|url-join)",
  ],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  moduleNameMapper: {
    "^rxjs/internal/(.*)$": "rxjs/dist/cjs/internal/$1",
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: "<rootDir>/src",
    }),
  },
  extraGlobals: ["Math"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  setupFiles: [
    "jest-webextension-mock",
    "fake-indexeddb/auto",
    "jest-fetch-mock/setupJest",
    "<rootDir>/tests/setup",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/mocks/index.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e"]
}
