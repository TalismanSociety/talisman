/* eslint-env es2021 */

const nodeFetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))
const { DefinePlugin } = require("webpack")
const { EsbuildPlugin } = require("esbuild-loader")

const apiKey = process.env.SIMPLE_LOCALIZE_API_KEY
const projectToken = process.env.SIMPLE_LOCALIZE_PROJECT_TOKEN
const endpoint = `https://api.simplelocalize.io/api/v4/export?downloadFormat=single-language-json&downloadOptions=SPLIT_BY_NAMESPACES`
const fallbackLanguages = { en: "English" }

module.exports = class SimpleLocalizeDownloadPlugin {
  constructor(
    options = {
      /**
       * If false (the default), this plugin will attempt to download translations from SimpleLocalize.
       * Following this, this plugin will substitute `process.env.SUPPORTED_LANGUAGES` for a map of downloaded languages.
       *
       * If true, this plugin will simply substitute `process.env.SUPPORTED_LANGUAGES` for `'{"en":"English"}'`.
       */
      devMode: false,
    }
  ) {
    this.options = options
  }

  apply(compiler) {
    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler

    const { devMode } = this.options
    const hasKeys = Boolean(apiKey && projectToken)
    let hasDownloaded = false

    if (!devMode && !hasKeys)
      console.warn(
        `No SimpleLocalize API key has been configured. This build will use the existing i18n translations at apps/extension/public/locales`
      )

    // only fetch translations for prod builds,
    // and only when the developer has SimpleLocalize keys available
    const fetchTranslations = !devMode && hasKeys
    if (!fetchTranslations) {
      compiler.hooks.afterPlugins.tap("SimpleLocalizeDownloadPlugin", ({ options }) => {
        setSupportedLanguages(options, fallbackLanguages, devMode)
      })

      // if we're not fetching translations, stop here
      // (don't tap into compiler.hooks.beforeRun or compiler.hooks.make)
      return
    }

    const getAndSetSupportedLanguages = async ({ options }, callback) => {
      if (!hasDownloaded) {
        console.log("Fetching languages from SimpleLocalize")
        const languages = await simpleLocalizeFetch(
          "https://api.simplelocalize.io/api/v1/languages"
        )
          .catch((error) => {
            console.error("Failed to fetch languages list:", error)
            return []
          })
          .then((result) => {
            if (result.status !== 200) throw new Error("Bad response from SimpleLocalize")
            return Object.fromEntries(result.data.map((lang) => [lang.key, lang.name]))
          })

        setSupportedLanguages(
          options,
          Object.keys(languages).length > 0 ? languages : fallbackLanguages
        )
      }
      callback()
    }

    // need different hooks for 'watch' and 'build' modes - https://github.com/webpack/webpack/issues/10061
    // only runs in 'watch' mode (like for dev)
    compiler.hooks.watchRun.tapAsync("SimpleLocalizeDownloadPlugin", getAndSetSupportedLanguages)
    // only runs in 'build' mode (like for prod)
    compiler.hooks.beforeRun.tapAsync("SimpleLocalizeDownloadPlugin", getAndSetSupportedLanguages)

    compiler.hooks.make.tapAsync("SimpleLocalizeDownloadPlugin", async (compilation, callback) => {
      if (!hasDownloaded) {
        console.log(`Getting translations from ${endpoint}`)
        const namespaces = await getNamespaceUrls()
        const namespaceJson = await Promise.all(
          namespaces.flatMap(({ url, namespace, language }) =>
            simpleLocalizeFetch(url)
              .then((json) => ({ namespace, language, json }))
              .catch((error) => {
                console.error(`Unable to get ${language} file for namespace ${namespace}:`, error)
                return []
              })
          )
        )

        namespaceJson.forEach(({ namespace, language, json }) =>
          compilation.emitAsset(
            `locales/${language}/${namespace}.json`,
            new RawSource(JSON.stringify(json))
          )
        )

        const languages = namespaceJson
          .map(({ language }) => language)
          .sort()
          .filter((language, index, all) => all.indexOf(language) === index)
        console.log(`Translations fetched for ${languages.join(", ")}`)
        hasDownloaded = true
      }

      callback()
    })
  }
}

// const getAndSetSupportedLanguages = async ({ options }, callback) => {
//   if (!options.skip) {
//     console.log("Fetching languages from SimpleLocalize")
//     const languages = await simpleLocalizeFetch("https://api.simplelocalize.io/api/v1/languages")
//       .catch((error) => {
//         console.error("Failed to fetch languages list:", error)
//         return []
//       })
//       .then((result) => {
//         if (result.status !== 200) throw new Error("Bad response from SimpleLocalize")
//         return Object.fromEntries(result.data.map((lang) => [lang.key, lang.name]))
//       })

//     setSupportedLanguages(
//       options,
//       Object.keys(languages).length > 0 ? languages : fallbackLanguages
//     )
//   }
//   callback()
// }

const setSupportedLanguages = (
  options,
  supportedLanguages = fallbackLanguages,
  devMode = false
) => {
  const definePlugin = options.plugins.find((plugin) => plugin instanceof DefinePlugin)
  const esbuildPlugin = options.plugins.find((plugin) => plugin instanceof EsbuildPlugin)
  if (!definePlugin && !esbuildPlugin)
    return console.warn(
      `No DefinePlugin found - process.env.SUPPORTED_LANGUAGES will not be substituted`
    )

  // we only need to know `supportedLanguages` is correct when we're building a production release
  if (!devMode) console.log("Setting supported languages", supportedLanguages)

  // Explanation for the double JSON.stringify:
  //
  // - first stringify turns JSON into a string e.g. `{ en: "English" }` -> `'{"en":"English"}'`
  // - second stringify puts string quotes around the string, e.g. `'{"en":"English"}'` -> `'"{\\"en\\":\\"English\\"}"'`
  //
  // The first stringify is necessary because process.env['key'] should be of type string, not object.
  //
  // The second stringify is necessary because DefinePlugin expects a code fragment, not a string.
  // From the DefinePlugin docs:
  // > Note that because the plugin does a direct text replacement,
  // > the value given to it must include actual quotes inside of the string itself.
  // >
  // > Typically, this is done either with either alternate quotes, such as '"production"',
  // > or by using JSON.stringify('production').
  if (definePlugin)
    definePlugin.definitions["process.env.SUPPORTED_LANGUAGES"] = JSON.stringify(
      JSON.stringify(supportedLanguages)
    )

  if (esbuildPlugin)
    esbuildPlugin.options.define["process.env.SUPPORTED_LANGUAGES"] = JSON.stringify(
      JSON.stringify(supportedLanguages)
    )
}

const simpleLocalizeFetch = (url) =>
  nodeFetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-SimpleLocalize-Token": apiKey,
    },
  }).then((response) => response.json())

/**
 * Fetch languages from CDN.
 * Returns shape:
 *
 *     Array<{ url: string, namespace: string, language: string }>
 */
const getNamespaceUrls = () =>
  simpleLocalizeFetch(endpoint)
    .then((data) => {
      const content = data?.data?.files
      if (!content) {
        console.log(data)
        throw new Error("Bad response from SimpleLocalize")
      }
      return content
    })
    .catch((error) => {
      console.error("Failed to get namespace urls:", error)
    })
