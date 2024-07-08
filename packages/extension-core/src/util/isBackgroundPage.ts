/*
Used to check if the current page is a background page. 
It is useful for preventing the execution of certain code inside or outside of the background page.
*/
export const isBackgroundPage = async () =>
  new Promise<boolean>((resolve) => {
    // Firefox
    if (chrome.runtime.getBackgroundPage) {
      chrome.runtime.getBackgroundPage((backgroundPage) => {
        if (!backgroundPage) return resolve(false)
        resolve(backgroundPage.location.href === window.location.href)
      })
    } else {
      // Chrome
      resolve(typeof window === "undefined")
    }
  })
