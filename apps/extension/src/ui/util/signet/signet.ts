import { addTrailingSlash } from "@talismn/util"
import { SignetVault } from "@ui/domains/Account/AccountAdd/AccountAddSignet/types"

export const signet = {
  /**
   * Open Signet's connect page in a new tab for users to select vaults to connect.
   * Communication is done using window.postMessage to communicate between 2 tabs.
   * @param signetUrl
   * @returns
   */
  getVaults: async (signetUrl: string) => {
    const newTab = window.open(`${addTrailingSlash(signetUrl)}connect`)

    return new Promise<SignetVault[]>((resolve, reject) => {
      if (!newTab) return reject("Failed to open new tab")

      const intervalId = setInterval(() => {
        try {
          if (newTab.closed) reject("Canceled")
        } catch (e) {
          // FireFox blocks access to newTab and throws an error
          clearInterval(intervalId)
          reject("Blocked by browser")
        }
      }, 500)

      const url = new URL(signetUrl)
      const handleNewMessage = (event: MessageEvent) => {
        const close = () => {
          clearInterval(intervalId)
          newTab.close()
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
