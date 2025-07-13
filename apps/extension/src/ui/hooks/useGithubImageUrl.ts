import { DEBUG } from "extension-shared"
import { useCallback, useEffect, useState } from "react"

const GITRAW_URL = "https://raw.githubusercontent.com/"
const GITHACK_URL = "https://rawcdn.githack.com/"
const STATICALLY_URL = "https://cdn.statically.io/gh/"

// statically seems to be the fastest and is geo distributed
// githack is slower, but is geo distributed,
// gitraw is straight from github so it reflects latest changes immediately, good for development
const GITHUB_SOURCE_FLOW = DEBUG
  ? [GITRAW_URL, STATICALLY_URL, GITHACK_URL]
  : [STATICALLY_URL, GITHACK_URL, GITRAW_URL]

const getFileUrl = (url: string | null | undefined, fallbackUrl: string, rotate?: boolean) => {
  // our chaindata urls are generated for gitraw, but for production we want to default to statically
  if (!rotate) url = url?.replace(/^https:\/\/raw.githubusercontent.com\//i, GITHUB_SOURCE_FLOW[0])

  if (!url || url === fallbackUrl) return fallbackUrl

  if (!rotate) return url

  for (let i = 0; i < GITHUB_SOURCE_FLOW.length; i++) {
    const source = GITHUB_SOURCE_FLOW[i]
    if (url.startsWith(source) && i < GITHUB_SOURCE_FLOW.length - 1) {
      // if we are in debug mode, rotate to the next source
      return GITHUB_SOURCE_FLOW[(i + 1) % GITHUB_SOURCE_FLOW.length] + url.slice(source.length)
    }
  }

  return fallbackUrl
}

export const useGithubImageUrl = (url: string | null | undefined, fallbackUrl: string) => {
  const [src, setSrc] = useState(() => getFileUrl(url, fallbackUrl))

  // if error, use another img provider
  const onError = useCallback(() => {
    setSrc(getFileUrl(src, fallbackUrl, true))
  }, [fallbackUrl, src])

  // if props changes, reset
  useEffect(() => {
    setSrc(getFileUrl(url, fallbackUrl))
  }, [fallbackUrl, url])

  return { src, onError }
}
