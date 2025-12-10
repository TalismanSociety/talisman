/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],
  setupFiles: ["<rootDir>/tests/setup.ts"],
}
