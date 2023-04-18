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
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        additionalHooks: "(useRecoilCallback|useRecoilTransaction_UNSTABLE)",
      },
    ],

    // TO DELETE
    // to add ASAP
    "jsx-a11y/no-autofocus": "off",
    // "jsx-a11y/click-events-have-key-events": "off",
    // "jsx-a11y/no-static-element-interactions": "off",
    "jsx-a11y/alt-text": "off",
    "jsx-a11y/tabindex-no-positive": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "jsx-a11y/no-noninteractive-element-to-interactive-role": "off",
  },
}
