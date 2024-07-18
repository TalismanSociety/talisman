/** @type {import('prettier').Config} */
const pluginsConfig = {
  plugins: [require("@ianvs/prettier-plugin-sort-imports"), require("prettier-plugin-tailwindcss")],
}

/** @type {import('prettier').Config} */
const importSortConfig = {
  importOrder: [
    // built-ins like `node:fs`
    "<TYPES>^(node:)", // type imports
    "<BUILT_IN_MODULES>", // imports
    "", // a gap

    // anything which doesn't match any other rules
    "<TYPES>", // type imports
    "<THIRD_PARTY_MODULES>", // imports
    "", // a gap

    // local aliases / packages starting with one of these prefixes
    "<TYPES>^(@common|@talisman|@ui|@tests|@extension/core|@extension/shared)(/.*)?$", // type imports
    "^(@common|@talisman|@ui|@tests|@extension/core|@extension/shared)(/.*)?$", // imports
    "", // a gap

    // local `./blah/something` packages
    "<TYPES>^[.]", // type imports
    "^[.]", // imports
  ],

  // defaults to "1.0.0" - higher versions of typescript unlock more import-sort capabilities
  // https://github.com/IanVS/prettier-plugin-sort-imports?tab=readme-ov-file#importordertypescriptversion
  importOrderTypeScriptVersion: "5.2.2",
}

/** @type {import('prettier').Config} */
module.exports = {
  ...pluginsConfig,
  ...importSortConfig,

  printWidth: 100,
  quoteProps: "consistent",
  semi: false,
}
