import { useMemo } from "react"

import { useCurrentTab } from "@ui/state"

export const useCurrentSite = () => {
  const tab = useCurrentTab()

  const { favIconUrl, title, id, isLoading, url } = useMemo(() => {
    const { favIconUrl, title, url } = tab || {}
    const id = url ? new URL(url).host : undefined
    return { id, title, favIconUrl, isLoading: !tab, url }
  }, [tab])

  return { id, url, title, favIconUrl, isLoading }
}
