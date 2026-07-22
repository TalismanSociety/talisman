import { githubChaindataDistUrl } from "../constants"
import log from "../log"
import { enrichWithBuiltinBitcoin } from "./builtinBitcoin"
import { type ChunkedParseResult, parseChaindataFileChunked } from "./chunkedValidation"
import { markChaindataValidated } from "./validatedCache"

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
  /** chunked validator (e.g. parseChaindataFileChunked) — runs in time slices, yielding the thread between them */
  validate?: (data: unknown, signal?: AbortSignal) => Promise<ChunkedParseResult<T>>
  signal?: AbortSignal
}

const fetchJsonFromGithubUrl = async <T>(
  url: string,
  { signal, validate }: FetchJsonFromGitHubOptions<T> = {}
): Promise<T> => {
  const req = await fetch(url, { signal })

  // uncomment the line below to test initChaindata provisioning
  // if (Date.now()) throw new Error("OMG SHE GOT A KNIFE!")

  if (!req.ok) {
    const fallbackUrl = getFallbackUrl(url)
    if (fallbackUrl) return fetchJsonFromGithubUrl(fallbackUrl, { validate, signal })
    throw new Error(`Failed to fetch from ${url}: ${req.status} ${req.statusText}`)
  }

  const data = await req.json()

  if (validate) {
    const start = performance.now()
    const result = await validate(data, signal)
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
export const fetchChaindata = (signal?: AbortSignal) =>
  fetchJsonFromGithubUrl(CHAINDATA_CONSOLIDATED_URL, {
    validate: (data, signal) => parseChaindataFileChunked(data, { signal }),
    signal,
    // mark the enriched object (the one that flows through the pipeline) so
    // storageValidated$ doesn't re-validate it on every emission
  }).then((data) => markChaindataValidated(enrichWithBuiltinBitcoin(data)))
