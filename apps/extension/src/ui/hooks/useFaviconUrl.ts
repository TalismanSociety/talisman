import { useEffect, useState } from "react"
import browser from "webextension-polyfill"

const getDuckDuckGoIconUrl = (url: string) =>
  `https://icons.duckduckgo.com/ip2/${url.replace(/(^\w+:|^)\/\//, "").split("/")[0]}.ico`

export const useFaviconUrl = (siteUrl: string) => {
  const [favIconUrl, setFavIconUrl] = useState<string>()

  useEffect(() => {
    const assignIconUrl = async () => {
      try {
        const origin = siteUrl.startsWith("http") ? new URL(siteUrl).origin : siteUrl
        const [tab] = await browser.tabs.query({ url: `${origin}/*` })
        if (tab?.favIconUrl) setFavIconUrl(tab.favIconUrl)
        else setFavIconUrl(getDuckDuckGoIconUrl(siteUrl))
      } catch (err) {
        // this is safe
        setFavIconUrl(getDuckDuckGoIconUrl(siteUrl))
      }
    }

    assignIconUrl()
  }, [siteUrl])

  return favIconUrl
}
