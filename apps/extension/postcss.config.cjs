/* eslint-env es2021 */

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    require("postcss-import"),
    require("tailwindcss/nesting"),
    require("tailwindcss")("./tailwind.config.cjs"),
    require("autoprefixer"),
  ],
}

module.exports = config
