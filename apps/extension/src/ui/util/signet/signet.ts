import { addTrailingSlash } from "@core/util/addTrailingSlash"
import { SignetVault } from "@ui/domains/Account/AccountAdd/AccountAddSignet/types"
import Browser from "webextension-polyfill"

export const signet = {
  /**
   * Open Signet's connect page in a new tab for users to select vaults to connect.
   * Communication is done using window.postMessage to communicate between 2 tabs.
   * @param signetUrl
   * @returns
   */
  getVaults: async (signetUrl: string) => {
    const newTab = await Browser.tabs.create({ url: `${addTrailingSlash(signetUrl)}connect` })

    return new Promise<SignetVault[]>((resolve, reject) => {
      if (!newTab) return reject("Failed to open new tab")

      Browser.tabs.onRemoved.addListener((tabId) => {
        if (newTab && tabId === newTab.id) reject("Canceled")
      })

      const url = new URL(signetUrl)
      const handleNewMessage = (event: MessageEvent) => {
        const close = () => {
          if (newTab?.id) Browser.tabs.remove(newTab.id)
          window.removeEventListener("message", handleNewMessage)
        }

        if (event.origin !== url.origin) return

        if (event.data.type === "signet(connect.cancel)") {
          close()
          reject("Canceled")
        }

        if (event.data.type === "signet(connect.continue)") {
          close()
          resolve(event.data.vaults as SignetVault[])
        }
      }

      window.addEventListener("message", handleNewMessage)
    })
  },
}
