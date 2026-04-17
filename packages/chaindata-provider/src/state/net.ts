import type z from "zod/v4"

import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { ChaindataFileSchema } from "./schema"

const CHAINDATA_CONSOLIDATED_URL = `${githubChaindataDistUrl}/chaindata.min.json`

// exported for tests
export const getFallbackUrl = (url: string) => {
  // if gitraw fails, try jsdelivr (note: jsdelivr paths use {user}/{repo}@{ref}/{path}).
  // only the {user}/{repo} part is parsed - the ref is kept verbatim because it may contain
  // slashes (e.g. feat/foo), which jsdelivr resolves greedily, same as github
  if (url.startsWith("https://raw.githubusercontent.com/")) {
    const fallbackUrl = url.replace(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//i,
      "https://cdn.jsdelivr.net/gh/$1/$2@"
    )
    // guard against malformed urls that the regex can't transform, to prevent infinite recursion
    return fallbackUrl !== url ? fallbackUrl : null
  }

  // can add more fallbacks here such as unpkg, etc.

  return null
}

type FetchJsonFromGitHubOptions<T> = {
  schema?: z.ZodType<T>
  signal?: AbortSignal
}

const fetchJsonFromGithubUrl = async <T>(
  url: string,
  { signal, schema }: FetchJsonFromGitHubOptions<T> = {}
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
    const start = performance.now()
    const result = schema.safeParse(data)
    log.debug(
      `[ChaindataProvider] Validating downloaded ${url?.split("/").pop()} took ${performance.now() - start} ms`
    )
    if (!result.success) {
      log.error("Failed to parse data from", url, { error: result.error })
      throw new Error(`Schema validation failed for ${url}`)
    }
    return result.data as T
  }

  return data as T
}

// export because of generate-init-data script
export const fetchChaindata = (signal?: AbortSignal, url?: string) =>
  fetchJsonFromGithubUrl(url ?? CHAINDATA_CONSOLIDATED_URL, { schema: ChaindataFileSchema, signal })
