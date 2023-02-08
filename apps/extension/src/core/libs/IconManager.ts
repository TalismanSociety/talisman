import { requestStore } from "@core/libs/requests/store"
import { windowManager } from "@core/libs/WindowManager"
import Browser from "webextension-polyfill"

class IconManager {
  constructor() {
    // update the icon when any of the request stores change
    requestStore.observable.subscribe(() => this.updateIcon(true))
  }

  private updateIcon(shouldClose?: boolean): void {
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

    Browser.browserAction.setBadgeText({ text })

    if (shouldClose && text === "") {
      windowManager.popupClose()
    }
  }
}

export { IconManager }
