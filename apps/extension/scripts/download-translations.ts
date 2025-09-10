/* eslint-disable no-console */
import "dotenv/config"

import { mkdirSync, writeFileSync } from "fs"
import path from "path"

if (!process.env.SIMPLE_LOCALIZE_API_KEY)
  throw new Error("Missing SIMPLE_LOCALIZE_API_KEY env variable")

const fallbackLanguages = { en: "English" }
const allowedNamespaces = ["common"]

type ApiFetchResult<T> = {
  msg: string
  status: number
  code?: string
  data: T
}

const supportedLanguages = process.env.SUPPORTED_LANGUAGES
  ? JSON.parse(process.env.SUPPORTED_LANGUAGES.replace(/'/g, '"'))
  : null

const simpleLocalizeFetch = async <T = unknown>(url: string) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-SimpleLocalize-Token": process.env.SIMPLE_LOCALIZE_API_KEY!,
    },
  })

  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} - ${res.statusText}`)

  return res.json() as Promise<ApiFetchResult<T>>
}

const fetchSupportedLanguages = async () => {
  const result = await simpleLocalizeFetch<{ key: string; name: string }[]>(
    "https://api.simplelocalize.io/api/v1/languages",
  )

  if (result.status !== 200) {
    console.warn(result)
    throw new Error("Bad response from SimpleLocalize")
  }

  // convert to dictionary that looks like:
  // {
  //   en: 'English',
  //   fr: 'Français',
  //   ...
  // }
  return Object.fromEntries(result.data.map((lang) => [lang.key, lang.name]))
}

const fetchNamespaceUrls = async () => {
  const result = await simpleLocalizeFetch<{
    files: Array<{ url: string; namespace: string; language: string }>
  }>(
    "https://api.simplelocalize.io/api/v4/export?downloadFormat=single-language-json&downloadOptions=SPLIT_BY_NAMESPACES",
  )

  if (result.status !== 200) {
    console.warn(result)
    throw new Error("Bad response from SimpleLocalize")
  }

  return result.data.files.filter((file) => allowedNamespaces.includes(file.namespace))
}

const fetchNamespaceJson = async (fileUrl: string) => {
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status} - ${res.statusText}`)
  const data = await res.json()
  return data
}

const downloadTranslations = async () => {
  // if set in .env file, use that
  let languages = supportedLanguages ?? (await fetchSupportedLanguages())
  if (Object.keys(languages).length === 0) {
    console.warn("No languages found, using fallback")
    languages = fallbackLanguages
  }

  const namespaces = await fetchNamespaceUrls()

  console.log(
    "Downloading %s languages: ",
    Object.keys(languages).length,
    Object.keys(languages).join(", "),
  )

  for (const lang of namespaces) {
    console.log("Downloading translations for", lang.language, lang.namespace)
    const json = await fetchNamespaceJson(lang.url)
    const dirPath = path.join(__dirname, "../public/locales", lang.language)
    mkdirSync(dirPath, { recursive: true }) // Ensure directory exists

    const filePath = path.join(dirPath, `${lang.namespace}.json`)
    console.log("Updating", filePath)
    writeFileSync(filePath, JSON.stringify(json, null, 2))
  }

  // when building, webpack will set the SUPPORTED_LANGUAGES environment variable with the contents of this file
  const languagesFilePath = path.join(__dirname, "../public/locales/languages.json")
  console.log("Updating", languagesFilePath)
  writeFileSync(languagesFilePath, JSON.stringify(languages, null, 2))
}

downloadTranslations()
  .then(() => {
    console.log("Done")
    process.exit(0)
  })
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
