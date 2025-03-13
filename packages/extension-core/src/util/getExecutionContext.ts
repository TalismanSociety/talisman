export const getExecutionContext = () => {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      if (chrome.extension?.getBackgroundPage && chrome.extension.getBackgroundPage() === window) {
        return "background" // Firefox or Chromium with persistent background page
      } else if (typeof document !== "undefined") {
        return "extension_page" // Popup, Options, or other extension pages
      }
    } else {
      return "content_script" // Running inside a normal webpage
    }
  } catch (e) {
    // ignore
  }
  return "unknown"
}
