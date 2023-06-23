/* eslint-env es2021 */

const nodeFetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))

const apiKey = process.env.SIMPLE_LOCALIZE_API_KEY
const endpoint = `https://api.simplelocalize.io/api/v1/translations`

/*
* Fetch languages from CDN
* returns shape:
  {
    key: "I've backed it up",
    language: 'en',
    text: "I've backed it up",
    namespace: 'settings',
    description: ''
  }[]
*/
const getTranslations = () =>
  nodeFetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-SimpleLocalize-Token": apiKey,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const content = data?.data?.content
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
    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler

    compiler.hooks.make.tapAsync("SimpleLocalizeDownloadPlugin", async (compilation, callback) => {
      console.log("Getting translations from ", endpoint)
      const langs = await getTranslations()

      const languages = langs.reduce((output, current) => {
        const { language, namespace, key, text } = current
        if (!output[language]) output[language] = {}
        if (!output[language][namespace]) output[language][namespace] = {}
        output[current.language][namespace][key] = text
        return output
      }, {})

      console.log("Got translations for :", Object.keys(languages).join(", "))
      Object.entries(languages).forEach(([language, namespaces]) => {
        Object.keys(namespaces).forEach((namespace) => {
          compilation.emitAsset(
            `locales/${language}/${namespace}.json`,
            new RawSource(JSON.stringify(namespaces[namespace]))
          )
        })
      })
      callback()
    })
  }
}

module.exports = SimpleLocalizeDownloadPlugin
