/* eslint-env es2021 */

const nodeFetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))
const { DefinePlugin } = require("webpack")

const apiKey = process.env.SIMPLE_LOCALIZE_API_KEY
const projectToken = process.env.SIMPLE_LOCALIZE_PROJECT_TOKEN
const endpoint = `https://api.simplelocalize.io/api/v4/export?downloadFormat=single-language-json&downloadOptions=SPLIT_BY_NAMESPACES`

const simpleLocalizeFetch = (url) =>
  nodeFetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-SimpleLocalize-Token": apiKey,
    },
  }).then((response) => response.json())

/*
* Fetch languages from CDN
* returns shape:
  { url:string, namespace:string, language: string }[]
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
      console.error("Error:", error)
    })

class SimpleLocalizeDownloadPlugin {
  apply(compiler) {
    // Do nothing if dev hasn't configured an api key for simplelocalize
    if (!apiKey || !projectToken) {
      console.warn(
        `No SimpleLocalize API key has been configured. This build will use the existing i18n translations at apps/extension/public/locales`
      )
      return
    }

    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler

    compiler.hooks.afterPlugins.tap("SimpleLocalizeDownloadPlugin", async ({ options }) => {
      const definePlugin = options.plugins.find((plugin) => plugin instanceof DefinePlugin)
      if (definePlugin) {
        const languages = await simpleLocalizeFetch(
          `https://cdn.simplelocalize.io/${projectToken}/_latest/_languages`
        )
        const supportedLanguages = languages.reduce((result, lang) => {
          result[lang.key] = lang.name
          return result
        }, {})

        console.log("Setting supported languages", supportedLanguages)
        definePlugin.definitions["process.env.SUPPORTED_LANGUAGES"] =
          JSON.stringify(supportedLanguages)
      }
    })

    compiler.hooks.make.tapAsync("SimpleLocalizeDownloadPlugin", async (compilation, callback) => {
      console.log("Getting translations from ", endpoint)
      const namespaces = await getNamespaceUrls()
      const namespaceJson = await Promise.all(
        namespaces.map(({ url, namespace, language }) =>
          simpleLocalizeFetch(url)
            .then((json) => {
              return { namespace, language, json }
            })
            .catch((error) => {
              console.error(`Unable to get ${language} file for namespace ${namespace}`)
              console.error(error)
              return undefined
            })
        )
      )

      namespaceJson.forEach((item) => {
        if (!item) return
        const { namespace, language, json } = item
        compilation.emitAsset(
          `locales/${language}/${namespace}.json`,
          new RawSource(JSON.stringify(json))
        )
      })

      callback()
    })
  }
}

module.exports = SimpleLocalizeDownloadPlugin
