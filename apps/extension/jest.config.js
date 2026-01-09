/* eslint-env es2023 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
const path = require("path")
const { defaults } = require("jest-config")
const { pathsToModuleNameMapper } = require("ts-jest")
const { compilerOptions } = require("./tsconfig.json")

// Resolve workspace packages to their source directories for testing
const packagesDir = path.resolve(__dirname, "../../packages")

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
    // Map workspace package internal paths to source (@talismn/* packages)
    "^@talismn/([^/]+)/src/(.*)$": `${packagesDir}/$1/src/$2`,
    // Map @talismn/* package main imports to built dist
    "^@talismn/([^/]+)$": `${packagesDir}/$1/dist/index.js`,
    // Map internal packages (extension-core, extension-shared, talisman-ui)
    "^extension-core/src/(.*)$": `${packagesDir}/extension-core/src/$1`,
    "^extension-shared/src/(.*)$": `${packagesDir}/extension-shared/src/$1`,
    "^talisman-ui/src/(.*)$": `${packagesDir}/talisman-ui/src/$1`,
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: "<rootDir>/src",
    }),
  },
  sandboxInjectedGlobals: ["Math"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx", "mjs"],
  setupFiles: [
    "jest-webextension-mock",
    "fake-indexeddb/auto",
    "jest-fetch-mock/setupJest",
    "<rootDir>/tests/setup",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/mocks/index.ts"],
  testEnvironment: "<rootDir>/tests/env.js",
}
