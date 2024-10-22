import configConventional from "@commitlint/config-conventional"

// Add 'wip' to the list of allowed commit types
const typeEnum = configConventional.rules["type-enum"]
typeEnum[2].push("wip")

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": typeEnum,
  },
}
