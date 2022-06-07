/* eslint-env es6 */
/** @type {import('ts-jest').InitialOptionsTsJest} */
const { defaults } = require("jest-config")
const { pathsToModuleNameMapper } = require("ts-jest")
const { compilerOptions } = require("./tsconfig.json")

module.exports = {
  preset: "ts-jest/presets/js-with-babel",
  transformIgnorePatterns: [
    "/node_modules/(?!@polkadot|@substrate|@babel/runtime/helpers/esm/|@metamask|url-join)",
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: "<rootDir>/src",
  }),
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  setupFiles: [
    "jest-webextension-mock",
    "fake-indexeddb/auto",
    "jest-fetch-mock/setupJest",
    "<rootDir>/tests/setup",
  ],
  testEnvironment: "jsdom",
}
