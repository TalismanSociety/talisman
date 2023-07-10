/* eslint-env es6 */

// The key is the `locale` as passed to i18next.
// The value is the `human-readable name` as passed to the language settings UI in the wallet.
const languages = process.env.SUPPORTED_LANGUAGES || {
  en: "English",
}

module.exports = {
  // use `common` instead of `translation` as the default namespace
  defaultNamespace: "common",

  // natural language keys
  namespaceSeparator: false,
  keySeparator: false,
  pluralSeparator: "_pluralSeparator_",

  // make sure this is kept in sync with apps/extension/src/ui/i18nConfig.ts
  locales: Object.keys(languages),
  // this `languages` key isn't needed for i18n-parser,
  // it's just here so that we can import it from our UI and access those juicy human-readable names
  languages,

  // use the translation key as the default value for 'en' translations,
  // since we write the keys as regular english in the sourcecode
  defaultValue: (locale, _namespace, key) => (locale === "en" ? key : ""),

  // you can use this one instead to help find non-i18n text in the UI
  // first, comment out the above `defaultValue` function, and uncomment this one
  // then, run `rm -rf apps/extension/public/locales/en`
  // then, run `yarn update:translations`
  // all i18n text in the UI will then be surrounded by `T__thetext__T`
  // this makes non-i18n text visibly stand out!
  // but, make sure you don't commit the locales once you're done:
  // to revert, first run `git checkout apps/extension/public/locales/en`
  // then run `git clean -ffd apps/extension/public/locales/en`
  // then comment out this `defaultValue` function, and uncomment the one above
  // then run `yarn update:translations` and commit the result
  // defaultValue: (locale, _namespace, key) => (locale === "en" ? `T__${key}__T` : ""),

  input: [
    // wallet core
    "src/core/**/*.{ts,tsx}",
    // wallet ui
    "src/ui/**/*.{ts,tsx}",
    // wallet @talisman components
    "src/@talisman/**/*.{ts,tsx}",
  ],
  output: "public/locales/$LOCALE/$NAMESPACE.json",
}
