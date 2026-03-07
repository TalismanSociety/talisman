import { IS_FIREFOX, log } from "extension-shared"

/**
 * Used to check if the current page is a background page.
 *
 * It is useful for preventing the execution of certain code inside or outside of the background page.
 */
export const isBackgroundPage = () => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.extension) {
      return IS_FIREFOX
        ? chrome.extension.getBackgroundPage() === window
        : typeof window === "undefined"
    }
  } catch (err) {
    log.error(err)
  }

  return false
}
