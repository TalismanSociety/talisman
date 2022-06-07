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
      plugins: ["@typescript-eslint", "simple-import-sort", "import"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],

      rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
        "no-console": "warn",

        // To add ASAP
        // "simple-import-sort/imports": "error",
        // "simple-import-sort/exports": "error",

        // To remove ASAP
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-this-alias": "off",
        "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
        "@typescript-eslint/triple-slash-reference": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-unnecessary-type-constraint": "off",
        "no-var": "off",
        "no-useless-catch": "off",
        "no-empty": "off",
        "no-prototype-builtins": "off",
        "no-case-declarations": "off",
        "no-extra-boolean-cast": "off",
        "prefer-const": "off",
      },
    },
  ],
}
