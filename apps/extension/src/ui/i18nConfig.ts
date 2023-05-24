import { DEBUG } from "@core/constants"
import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import HttpBackend, { HttpBackendOptions } from "i18next-http-backend"
import sprintf from "i18next-sprintf-postprocessor"
import { initReactI18next } from "react-i18next"

import i18nextParserConfig from "../../i18next-parser.config.cjs"

i18next
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(sprintf)
  .use(initReactI18next)
  .init<HttpBackendOptions>({
    // use 'common' as default and fallback namespace
    // imported from i18next-parser.config.cjs so that these two files are kept in sync
    defaultNS: i18nextParserConfig.defaultNamespace,
    fallbackNS: i18nextParserConfig.defaultNamespace,

    // natural language keys
    // imported from i18next-parser.config.cjs so that these two files are kept in sync
    nsSeparator: i18nextParserConfig.namespaceSeparator as false,
    keySeparator: i18nextParserConfig.keySeparator as false,
    pluralSeparator: i18nextParserConfig.pluralSeparator,

    // supported languages
    // make sure this is kept in sync with apps/extension/i18next-parser.config.cjs
    supportedLngs: [
      // necessary (is the default before LanguageDetector chimes in)
      "dev",

      // the actual languages
      // imported from i18next-parser.config.cjs so that these two files are kept in sync
      ...i18nextParserConfig.locales,
    ],
    // use natural language 'en' keys as fallback for languages with no
    // translation for a value
    fallbackLng:
      // should always be true, so 'en', but I added a check here just in case 'en' isn't in the list
      i18nextParserConfig.locales.includes("en") ? "en" : "dev",

    // the `t` funtion should always return a string or undefined
    returnNull: false,
    returnEmptyString: false,

    // show debug info in debug builds
    debug: DEBUG,

    // allow sprintf in `t` function by default
    // e.g.
    // const words = 12
    // const { t } = useTranslation('account-add')
    // t("Word count (sprintf example usage): %s", words) // > 'Word count (sprintf example usage): 12'
    overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,

    // user lang auto-detection config
    detection: {
      // use localstorage if the key `lang` exists, otherwise
      // fall back to browser language
      //
      // we use the `lang` key in the wallet settings ui
      order: [
        "localStorage", // key lang=LANGUAGE
        "navigator", // browser language
      ],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },

    // react config
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    react: {
      bindI18n: "languageChanged",
      bindI18nStore: "",
      transEmptyNodeValue: "",
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ["br", "strong", "i"],
      useSuspense: true,
    },
  })
