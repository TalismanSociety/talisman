import { tabAtom } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useMemo } from "react"

export const useCurrentSite = () => {
  const tab = useAtomValue(tabAtom)

  const { favIconUrl, title, id, isLoading, url } = useMemo(() => {
    const { favIconUrl, title, url } = tab || {}
    const id = url ? new URL(url).host : undefined
    return { id, title, favIconUrl, isLoading: !tab, url }
  }, [tab])

  return { id, url, title, favIconUrl, isLoading }
}
