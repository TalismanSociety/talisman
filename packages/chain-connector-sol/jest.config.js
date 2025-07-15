/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },
  transformIgnorePatterns: [],
  moduleNameMapper: {
    "^lodash-es$": "lodash",
  },
}
