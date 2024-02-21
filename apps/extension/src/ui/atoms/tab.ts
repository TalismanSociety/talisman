import { atom } from "jotai"
import Browser from "webextension-polyfill"

export const tabAtom = atom(async () => {
  const [currentTab] = await Browser.tabs.query({ active: true, currentWindow: true })
  return currentTab
})
