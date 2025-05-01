import { useCallback, useEffect, useState } from "react"

const getImageUrl = (url: string | null | undefined, fallbackUrl: string, rotate?: boolean) => {
  if (!url || url === fallbackUrl) return fallbackUrl
  if (!rotate) return url

  // if githack fails, try statically
  if (url.startsWith("https://raw.githubusercontent.com/"))
    return url.replace("https://raw.githubusercontent.com/", "https://cdn.statically.io/gh/")

  // if statically fails, use fallback image
  if (url.startsWith("https://cdn.statically.io/gh/")) return fallbackUrl

  return fallbackUrl
}

export const useGithubImageUrl = (url: string | null | undefined, fallbackUrl: string) => {
  const [src, setSrc] = useState(() => getImageUrl(url, fallbackUrl))

  // if error, use another img provider
  const onError = useCallback(() => {
    setSrc(getImageUrl(src, fallbackUrl, true))
  }, [fallbackUrl, src])

  // if props changes, reset
  useEffect(() => {
    setSrc(getImageUrl(url, fallbackUrl))
  }, [fallbackUrl, url])

  return { src, onError }
}
