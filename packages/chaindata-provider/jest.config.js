/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"],

  preset: "ts-jest",
  testEnvironment: "node",
}
