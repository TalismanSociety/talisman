module.exports = {
  settings: {
    react: {
      version: "detect",
    },
  },
  plugins: ["react", "jest"],
  extends: [
    "eslint-config-talisman",
    // to add ASAP
    // "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    // to add ASAP
    //"plugin:jsx-a11y/recommended",
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
}
