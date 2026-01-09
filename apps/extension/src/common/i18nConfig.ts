import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend, { HttpBackendOptions } from "i18next-http-backend"
import { initReactI18next } from "react-i18next"

import {
  defaultNamespace,
  languages as i18nLanguages,
  keySeparator,
  namespaceSeparator,
  pluralSeparator,
} from "./i18nParserConfig"

// juicy human-readable names
export const languages: Record<string, string> = process.env.SUPPORTED_LANGUAGES
  ? // prod builds (fetched from SimpleLocalize)
    JSON.parse(process.env.SUPPORTED_LANGUAGES)
  : // dev builds (just English)
    i18nLanguages

const locales = Object.keys(languages)

i18next.on("languageChanged", (lng) => {
  document.documentElement.lang = lng
})

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(HttpBackend)
  .init<HttpBackendOptions>({
    // use 'common' as default and fallback namespace
    // kept in sync with i18nParserConfig.ts and i18next-parser.config.cjs
    ns: defaultNamespace,
    defaultNS: defaultNamespace,
    fallbackNS: defaultNamespace,

    // natural language keys
    // kept in sync with i18nParserConfig.ts and i18next-parser.config.cjs
    nsSeparator: namespaceSeparator as false,
    keySeparator: keySeparator as false,
    pluralSeparator: pluralSeparator,

    // supported languages
    // make sure this is kept in sync with i18nParserConfig.ts and i18next-parser.config.cjs
    supportedLngs: [
      // necessary (is the default before LanguageDetector chimes in)
      "dev",

      // the actual languages
      // kept in sync with i18nParserConfig.ts for development
      // fetched from SimpleLocalize as part of the build process for production builds
      ...locales,
    ],
    // use natural language 'en' keys as fallback for languages with no
    // translation for a value
    fallbackLng:
      // should always be true, so 'en', but I added a check here just in case 'en' isn't in the list
      locales.includes("en") ? "en" : "dev",

    // the `t` funtion should always return a string or undefined
    returnNull: false,
    returnEmptyString: false,

    debug: false,

    // user lang auto-detection config
    detection: {
      // use localstorage if the key `lang` exists, otherwise
      // fall back to browser language
      //
      // we use the `lang` key in the wallet settings ui
      order: ["localStorage"], // key lang=LANGUAGE
      //   "navigator", // browser language
      // ], // todo reinstate navigator when we support i18n officially
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },

    // react config
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  })

export default i18next
