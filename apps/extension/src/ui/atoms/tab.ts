import { atom } from "jotai"

export const tabAtom = atom(async () => {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return currentTab
})
