module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: ["eslint:recommended", "prettier"],

  // typescript specifics as override or all js files would raise errors
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint", "import"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],

      rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
        "no-console": "warn",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/triple-slash-reference": "off",
      },
    },
  ],
}
