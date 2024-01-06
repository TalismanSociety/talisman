import { useMemo } from "react"
import { atom, useRecoilValue } from "recoil"
import browser from "webextension-polyfill"

const tabState = atom<browser.Tabs.Tab>({
  key: "tabState",
  effects: [
    ({ setSelf }) => {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([currentTab]) => setSelf(currentTab))
    },
  ],
})

export const useCurrentSite = () => {
  const tab = useRecoilValue(tabState)

  const { favIconUrl, title, id, isLoading, url } = useMemo(() => {
    const { favIconUrl, title, url } = tab || {}
    const id = url ? new URL(url).host : undefined
    return { id, title, favIconUrl, isLoading: !tab, url }
  }, [tab])

  return { id, url, title, favIconUrl, isLoading }
}

// export const [CurrentSiteProvider, useCurrentSite] = provideContext(useCurrentSiteProviderValue)
