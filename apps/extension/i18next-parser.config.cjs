module.exports = {
  defaultNamespace: "common",

  // natural language keys
  namespaceSeparator: false,
  keySeparator: false,
  pluralSeparator: "_pluralSeparator_",

  // make sure this is kept in sync with apps/extension/src/ui/i18nConfig.ts
  locales: ["en", "cn", "ru"],
  defaultValue: function (locale, _namespace, key) {
    // use the translation key as the default value for 'en' translations,
    // since we write the keys as regular english in the sourcecode
    return locale === "en" ? key : ""
  },
  input: ["src/ui/**/*.{ts,tsx}"],
  output: "public/locales/$LOCALE/$NAMESPACE.json",
}
