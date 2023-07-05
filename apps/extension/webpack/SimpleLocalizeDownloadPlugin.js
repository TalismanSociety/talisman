/* eslint-env es2021 */

const nodeFetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args))

const apiKey = process.env.SIMPLE_LOCALIZE_API_KEY
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
    const {
      webpack: {
        sources: { RawSource },
      },
    } = compiler

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
