/* eslint-env es2021 */
const postcssImport = require("postcss-import")
const tailwindcss = require("tailwindcss")
const autoprefixer = require("autoprefixer")

module.exports = {
  plugins: [postcssImport, tailwindcss("./tailwind.config.cjs"), autoprefixer],
}
