import { bind } from "@react-rxjs/core"
import { from, shareReplay } from "rxjs"

const getCurrentTab = async () => {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return currentTab
}

export const [useCurrentTab, currentTab$] = bind(from(getCurrentTab()).pipe(shareReplay(1)))
