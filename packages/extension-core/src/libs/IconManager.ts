import { requestStore } from "./requests/store"

class IconManager {
  constructor() {
    // update the icon when any of the request stores change
    requestStore.observable.subscribe(() => this.updateIcon())
  }

  private updateIcon(): void {
    const counts = requestStore.getCounts()
    const signingCount =
      counts.get("eth-send") + counts.get("eth-sign") + counts.get("substrate-sign")

    const text = counts.get("auth")
      ? "Sites"
      : counts.get("metadata")
      ? "Meta"
      : signingCount
      ? `${signingCount}`
      : counts.get("eth-network-add")
      ? "Network"
      : counts.get("eth-watchasset")
      ? "Assets"
      : counts.get("encrypt")
      ? "Encrypt"
      : counts.get("decrypt")
      ? "Decrypt"
      : ""

    chrome.action.setBadgeText({ text })
  }
}

export { IconManager }
