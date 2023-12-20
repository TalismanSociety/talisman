export const signet = {
  getVaults: async (signetUrl: string) => {
    const newTab = window.open(`${signetUrl}/connect`)

    return new Promise((resolve, reject) => {
      if (!newTab) return reject("Failed to open new tab")

      const intervalId = setInterval(() => {
        if (newTab.closed) {
          reject("Canceled")
        }
      }, 500)

      const handleNewMessage = (event: MessageEvent) => {
        const close = () => {
          clearInterval(intervalId)
          newTab.close()
          window.removeEventListener("message", handleNewMessage)
        }

        if (event.origin !== signetUrl) return

        if (event.data.type === "signet(connect.cancel)") {
          close()
          reject("Canceled")
        }

        if (event.data.type === "signet(connect.continue)") {
          close()
          resolve(event.data.vaults)
        }
      }

      window.addEventListener("message", handleNewMessage)
    })
  },
}
