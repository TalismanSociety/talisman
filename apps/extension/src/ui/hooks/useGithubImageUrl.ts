import { DEBUG } from "@common/constants"
import { useCallback, useEffect, useState } from "react"

import { invalidateCachedImage, useImageSwr } from "./imageCache"

type GithubAsset = { user: string; repo: string; ref: string; path: string }

type GithubSource = {
  match: RegExp
  build: (asset: GithubAsset) => string
}

// jsdelivr is geo distributed and serves long-lived cache headers (7d browser / 12h edge), best for production
// gitraw is straight from github so it reflects latest changes immediately, good for development
// NOTE: statically.io has been sunset (it now hangs or slow-redirects to gitraw) and githack returns 403s - don't use them
const GITRAW: GithubSource = {
  match: /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i,
  build: ({ user, repo, ref, path }) =>
    `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${path}`,
}

const JSDELIVR: GithubSource = {
  match: /^https:\/\/cdn\.jsdelivr\.net\/gh\/([^/@]+)\/([^/@]+)@([^/]+)\/(.+)$/i,
  build: ({ user, repo, ref, path }) =>
    `https://cdn.jsdelivr.net/gh/${user}/${repo}@${ref}/${path}`,
}

// dead sources that may still appear in persisted data, parsed only so they can be normalized to the flow below
const LEGACY_PATTERNS = [
  /^https:\/\/cdn\.statically\.io\/gh\/([^/@]+)\/([^/@]+)[@/]([^/]+)\/(.+)$/i,
  /^https:\/\/rawcdn\.githack\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i,
]

const GITHUB_SOURCE_FLOW = DEBUG ? [GITRAW, JSDELIVR] : [JSDELIVR, GITRAW]

const parseGithubUrl = (url: string): { asset: GithubAsset; sourceIndex: number } | null => {
  for (let i = 0; i < GITHUB_SOURCE_FLOW.length; i++) {
    const match = GITHUB_SOURCE_FLOW[i].match.exec(url)
    if (match) {
      const [, user, repo, ref, path] = match
      return { asset: { user, repo, ref, path }, sourceIndex: i }
    }
  }

  for (const pattern of LEGACY_PATTERNS) {
    const match = pattern.exec(url)
    if (match) {
      const [, user, repo, ref, path] = match
      // legacy urls restart the flow from the preferred source
      return { asset: { user, repo, ref, path }, sourceIndex: -1 }
    }
  }

  return null
}

const isGithubUrl = (url: string): boolean => parseGithubUrl(url) !== null

const getFileUrl = (url: string | null | undefined, fallbackUrl: string, rotate?: boolean) => {
  if (!url || url === fallbackUrl) return fallbackUrl

  const parsed = parseGithubUrl(url)

  // non-github urls are used as-is, with the placeholder as only fallback
  if (!parsed) return rotate ? fallbackUrl : url

  // our chaindata urls are generated for gitraw : normalize to the preferred source on first render
  // on error, rotate to the next source, and to the placeholder once all sources failed
  const sourceIndex = rotate ? parsed.sourceIndex + 1 : 0
  if (sourceIndex >= GITHUB_SOURCE_FLOW.length) return fallbackUrl

  return GITHUB_SOURCE_FLOW[sourceIndex].build(parsed.asset)
}

export const useGithubImageUrl = (url: string | null | undefined, fallbackUrl: string) => {
  // SWR data-URL cache for non-GitHub images (provider logos, defi logos, etc.)
  const shouldCache =
    !!url && (url.startsWith("https://") || url.startsWith("http://")) && !isGithubUrl(url)
  const cachedSrc = useImageSwr(shouldCache ? url : null)

  const [src, setSrc] = useState(() => getFileUrl(url, fallbackUrl))

  // if error, invalidate cache (if any) and use another img provider
  const onError = useCallback(() => {
    if (cachedSrc && url) invalidateCachedImage(url)
    setSrc(getFileUrl(src, fallbackUrl, true))
  }, [cachedSrc, url, fallbackUrl, src])

  // if props changes, reset
  useEffect(() => {
    setSrc(getFileUrl(url, fallbackUrl))
  }, [fallbackUrl, url])

  // Prefer cached data-URL for non-GitHub images
  return { src: cachedSrc ?? src, onError }
}
