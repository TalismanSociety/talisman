import z from "zod/v4"

import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { ChaindataFileSchema } from "./schema"

export const CHAINDATA_CONSOLIDATED_URL = `${githubChaindataDistUrl}/chaindata.min.json`

const getFallbackUrl = (url: string) => {
  // if githack fails, try statically
  if (url.startsWith("https://raw.githubusercontent.com/"))
    return url.replace("https://raw.githubusercontent.com/", "https://cdn.statically.io/gh/")

  // can add more fallbacks here such as jsdelivr, unpkg, etc.

  return null
}

type FetchJsonFromGitHubOptions<T> = {
  schema?: z.ZodType<T>
  signal?: AbortSignal
}

const fetchJsonFromGithubUrl = async <T>(
  url: string,
  { signal, schema }: FetchJsonFromGitHubOptions<T> = {},
): Promise<T> => {
  const req = await fetch(url, { signal })

  // uncomment the line below to test initChaindata provisioning
  // if (Date.now()) throw new Error("OMG SHE GOT A KNIFE!")

  if (!req.ok) {
    const fallbackUrl = getFallbackUrl(url)
    if (fallbackUrl) return fetchJsonFromGithubUrl(fallbackUrl, { schema, signal })
    throw new Error(`Failed to fetch from ${url}: ${req.status} ${req.statusText}`)
  }

  const data = await req.json()

  if (schema) {
    const result = schema.safeParse(data)
    if (!result.success) log.warn("Failed to parse data from", url, { error: result.error, data })
    else return result.data as T
  }

  return data as T
}

// export because of generate-init-data script
export const fetchChaindata = (signal?: AbortSignal) =>
  fetchJsonFromGithubUrl(CHAINDATA_CONSOLIDATED_URL, { schema: ChaindataFileSchema, signal })
