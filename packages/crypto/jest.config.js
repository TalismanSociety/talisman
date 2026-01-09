const path = require("path")

const packagesDir = path.resolve(__dirname, "..")

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
  moduleNameMapper: {
    "^@talismn/([^/]+)$": `${packagesDir}/$1/dist/index.js`,
  },
  setupFiles: ["<rootDir>/tests/setup.ts"],
}
