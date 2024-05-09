import { useMemo } from "react"

export const useOriginFromUrl = (url: string | undefined): string => {
  return useMemo(() => {
    if (url) {
      try {
        return new URL(url).origin
      } catch (err) {
        // ignore
      }
    }
    return window.location.origin // fallback to extension's origin
  }, [url])
}
