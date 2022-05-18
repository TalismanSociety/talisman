import { useEffect, useMemo, useState } from "react"
import browser from "webextension-polyfill"
import { provideContext } from "@talisman/util/provideContext"

const useCurrentSiteProviderValue = () => {
  const [tab, setTab] = useState<browser.Tabs.Tab>()

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([currentTab]) => {
      setTab(currentTab)
    })
  }, [])

  const { favIconUrl, title, id, isLoading, url } = useMemo(() => {
    const { favIconUrl, title, url } = tab || {}
    const id = url ? new URL(url).host : undefined
    return { id, title, favIconUrl, isLoading: !tab, url }
  }, [tab])

  return { id, url, title, favIconUrl, isLoading }
}

export const [CurrentSiteProvider, useCurrentSite] = provideContext(useCurrentSiteProviderValue)
