/* eslint-env es2021 */

const nodeFetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))
const { DefinePlugin } = require("webpack")

const apiKey = process.env.SIMPLE_LOCALIZE_API_KEY
const projectToken = process.env.SIMPLE_LOCALIZE_PROJECT_TOKEN
const endpoint = `https://api.simplelocalize.io/api/v4/export?downloadFormat=single-language-json&downloadOptions=SPLIT_BY_NAMESPACES`

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
    const hasKeys = apiKey && projectToken

    // only fetch translations for prod builds,
    // and only when the developer has SimpleLocalize keys available
    const fetchTranslations = !devMode && hasKeys

    if (!devMode && !hasKeys)
      console.warn(
        `No SimpleLocalize API key has been configured. This build will use the existing i18n translations at apps/extension/public/locales`
      )

    compiler.hooks.beforeRun.tapAsync(
      "SimpleLocalizeDownloadPlugin",
      async ({ options }, callback) => {
        const definePlugin = options.plugins.find((plugin) => plugin instanceof DefinePlugin)
        if (!definePlugin) return

        const languages = await (async () => {
          if (!fetchTranslations) return []

          try {
            return await simpleLocalizeFetch(
              `https://cdn.simplelocalize.io/${projectToken}/_latest/_languages`
            )
          } catch (error) {
            console.error("Failed to fetch languages list:", error)
            return []
          }
        })()

        const supportedLanguages =
          languages.length > 0
            ? Object.fromEntries(languages.map((lang) => [lang.key, lang.name]))
            : { en: "English" }

        console.log("Setting supported languages", supportedLanguages)
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
        definePlugin.definitions["process.env.SUPPORTED_LANGUAGES"] = JSON.stringify(
          JSON.stringify(supportedLanguages)
        )

        callback()
      }
    )

    // if we're not fetching translations, stop here (don't tap into compiler.hooks.make)
    if (!fetchTranslations) return

    compiler.hooks.make.tapAsync("SimpleLocalizeDownloadPlugin", async (compilation, callback) => {
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
      callback()
    })
  }
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
