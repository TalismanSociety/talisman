import { isAbortError } from "@talismn/util"

import { DEFAULT_CHAINDATA_URL } from "../constants"
import log from "../log"
import type { ChunkedParseResult } from "./chunkedValidation"
import { validateChaindata } from "./validatedCache"

// exported for tests
export const getFallbackUrl = (url: string) => {
  // if gitraw is unreachable, try jsdelivr. The fallback url names the same repository, ref and
  // path, so jsdelivr serves the same files. It caches a branch for up to 12 hours, so its copy
  // can be older than github's, but it never comes from another repository or ref.
  // (note: jsdelivr paths use {user}/{repo}@{ref}/{path}).
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

type FetchJsonOptions<T> = {
  /** chunked validator (e.g. parseChaindataFileChunked) — runs in time slices, yielding the thread between them */
  validate?: (data: unknown, signal?: AbortSignal) => Promise<ChunkedParseResult<T>>
  signal?: AbortSignal
  fallbackUrl?: string | null
}

/**
 * The fallback is used only when the primary origin is unavailable: the request fails at the
 * network level, or the server answers with a 5xx. A 4xx is an answer from the primary (missing
 * file, rate limit), and a body that is not valid JSON or fails validation is a problem with the
 * data, not the origin: neither switches origin. The caller retries with backoff, and the
 * persisted or bundled chaindata covers the gap meanwhile.
 */
const fetchJson = async <T>(
  url: string,
  { signal, validate, fallbackUrl }: FetchJsonOptions<T> = {}
): Promise<T> => {
  let req: Response
  try {
    req = await fetch(url, { signal })
  } catch (cause) {
    if (fallbackUrl && !isAbortError(cause) && !signal?.aborted)
      return fetchJson(fallbackUrl, { validate, signal })
    throw cause
  }

  // uncomment the line below to test initChaindata provisioning
  // if (Date.now()) throw new Error("OMG SHE GOT A KNIFE!")

  if (!req.ok) {
    if (fallbackUrl && req.status >= 500) return fetchJson(fallbackUrl, { validate, signal })
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
export const fetchChaindata = (url = DEFAULT_CHAINDATA_URL, signal?: AbortSignal) =>
  fetchJson(url, {
    validate: (data, signal) => validateChaindata(data, { signal }),
    signal,
    // jsdelivr caches for up to 12 hours, which would serve stale data for a custom file updated more often
    fallbackUrl: url === DEFAULT_CHAINDATA_URL ? getFallbackUrl(url) : null,
  })
