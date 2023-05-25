/* eslint-env es6 */

module.exports = {
  // use `common` instead of `translation` as the default namespace
  defaultNamespace: "common",

  // natural language keys
  namespaceSeparator: false,
  keySeparator: false,
  pluralSeparator: "_pluralSeparator_",

  // make sure this is kept in sync with apps/extension/src/ui/i18nConfig.ts
  locales: ["en", "cn", "ru"],

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

  input: ["src/ui/**/*.{ts,tsx}"],
  output: "public/locales/$LOCALE/$NAMESPACE.json",
}
