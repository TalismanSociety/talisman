module.exports = {
  printWidth: 100,
  quoteProps: "consistent",
  semi: false,
  pluginSearchDirs: ["./node_modules"],
  plugins: ["@trivago/prettier-plugin-sort-imports"],
  importOrder: ["<THIRD_PARTY_MODULES>", "^@talisman/(.*)$", "^@core/(.*)$", "^@ui/(.*)$", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  importOrderCaseInsensitive: true,
}
