import Browser from "webextension-polyfill"

const WINDOW_OPTS: Browser.Windows.CreateCreateDataType = {
  // This is not allowed on FF, only on Chrome - disable completely
  // focused: true,
  height: 630,
  type: "popup",
  url: Browser.runtime.getURL("popup.html"),
  width: 400,
}

class WindowManager {
  #windows: number[] = []

  popupClose(): void {
    this.#windows.forEach((id) => Browser.windows.remove(id))
    this.#windows = []
  }

  async popupOpen(argument?: string) {
    const currWindow = await Browser.windows.getLastFocused()

    const { left, top } = {
      top: 100 + (currWindow?.top ?? 0),
      left:
        (currWindow?.width ? (currWindow.left ?? 0) + currWindow.width : window.screen.availWidth) -
        410,
    }

    const popup = await Browser.windows.create({
      ...WINDOW_OPTS,
      top,
      left,
      url: Browser.runtime.getURL(`popup.html${argument ? argument : ""}`),
    })

    if (typeof popup?.id !== "undefined") {
      this.#windows.push(popup.id || 0)
      // firefox compatibility (cannot be set at creation)
      if (popup.left !== left && popup.state !== "fullscreen") {
        await Browser.windows.update(popup.id, { left, top })
      }
    }
  }
}

export const windowManager = new WindowManager()
