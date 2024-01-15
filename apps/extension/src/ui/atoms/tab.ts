import { log } from "@core/log"
import { atom } from "recoil"
import Browser from "webextension-polyfill"

export const tabState = atom<Browser.Tabs.Tab>({
  key: "tabState",
  effects: [
    ({ setSelf }) => {
      log.debug("tabState.init")
      Browser.tabs
        .query({ active: true, currentWindow: true })
        .then(([currentTab]) => setSelf(currentTab))
    },
  ],
})
