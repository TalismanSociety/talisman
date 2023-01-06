// Because both of these prettier plugins hijack the typescript parser,
// we can only use one of them at a time!
//
// If we try to use both, the second will overwrite the first.
//
// What follows is a workaround stolen from:
// https://github.com/tailwindlabs/prettier-plugin-tailwindcss/issues/31#issuecomment-1203264916

const pluginImportSort = require("prettier-plugin-import-sort")
const pluginTailwindcss = require("prettier-plugin-tailwindcss")

/** @type {import("prettier").Parser}  */
const myParser = {
  ...pluginImportSort.parsers.typescript,
  parse:
    pluginTailwindcss.parsers.typescript.parse,
}

/** @type {import("prettier").Plugin}  */
const myPlugin = {
  parsers: {
    typescript: myParser,
  },
}

module.exports = {
  plugins: [myPlugin],

  printWidth: 100,
  quoteProps: "consistent",
  semi: false,
}
