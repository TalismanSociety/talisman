module.exports = {
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: ["react", "jest"],
  extends: [
    "@talismn/eslint-config/base",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/no-unescaped-entities": "off",
    "react/jsx-no-target-blank": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": ["warn"],

    "jsx-a11y/media-has-caption": "off",

    // do not turn off autofocus rule. autoFocus may break drawer/modal animations. disable on a per case basis at your own risk
    // "jsx-a11y/no-autofocus": "off",
  },
}
