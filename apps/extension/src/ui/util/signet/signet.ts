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
      // NOTE: In Firefox, attempting to access `newTab` after the signet tab has been closed
      // will throw an error with the message `can’t access dead object`:
      // https://blog.mozilla.org/addons/2012/09/12/what-does-cant-access-dead-object-mean
      //
      // To handle this, we guard this call with a `try {} catch {}`,
      // and if it throws we'll consider newTab to be falsy
      try {
        if (!newTab) throw new Error()
      } catch {
        return reject("Failed to open new tab")
      }

      let checkTabClosedInterval: ReturnType<typeof setInterval> | null = null

      const signetOrigin = new URL(signetUrl).origin
      const handleNewMessage = (event: MessageEvent) => {
        const close = () => {
          checkTabClosedInterval && clearInterval(checkTabClosedInterval)
          try {
            newTab.close()
          } catch {
            // no-op - either we managed to close the tab, or we can't access it via `newTab` anymore
          }
          window.removeEventListener("message", handleNewMessage)
        }

        if (event.origin !== signetOrigin) return

        if (event.data.type === "signet(connect.cancel)") {
          close()
          return reject("Canceled")
        }

        if (event.data.type === "signet(connect.continue)") {
          close()
          return resolve(event.data.vaults as SignetVault[])
        }
      }
      window.addEventListener("message", handleNewMessage)

      checkTabClosedInterval = setInterval(() => {
        // NOTE: In Firefox, attempting to access `newTab` after the signet tab has been closed
        // will throw an error with the message `can’t access dead object`:
        // https://blog.mozilla.org/addons/2012/09/12/what-does-cant-access-dead-object-mean
        //
        // To handle this, we guard this call with a `try {} catch {}`,
        // and if it throws we'll consider newTab.closed to be true
        const closed = (() => {
          try {
            if (!newTab) throw new Error()
            return newTab.closed
          } catch {
            return true
          }
        })()

        if (!closed) return // tab still open

        checkTabClosedInterval && clearInterval(checkTabClosedInterval)
        window.removeEventListener("message", handleNewMessage)

        reject("Signet tab closed")
      }, 500)
    })
  },
}
