import { SignetVault } from "@ui/domains/Account/AccountAdd/AccountAddSignet/types"

export const signet = {
  /**
   * Open Signet's connect page in a new tab for users to select vaults to connect.
   * Communication is done using window.postMessage to communicate between 2 tabs.
   * @param signetUrl Works for 4 formats of signetUrl: {{signetUrl}}, {{signetUrl}}/, {{signetUrl}}/overview, {{signetUrl}}/overview/
   * @returns
   */
  getVaults: async (signetUrl: string) => {
    // if overview is present, we get the beginning of the url until overview
    // otherwise we use the whole url
    const withoutOverview = signetUrl.split("overview")[0]
    const url = new URL(withoutOverview)
    const newTab = window.open(`${url.href}connect`)

    return new Promise<SignetVault[]>((resolve, reject) => {
      if (!newTab) return reject("Failed to open new tab")

      const intervalId = setInterval(() => {
        if (newTab.closed) reject("Canceled")
      }, 500)

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
