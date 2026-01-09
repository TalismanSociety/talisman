// WXT Background Script Entry Point
// Imports the main background logic from extension-core

// Import the background module - this is a side-effect module that initializes the extension
// The import must happen at the top level, not inside defineBackground callback
import "extension-core/background"

export default defineBackground(() => {
  // Background initialization is handled by extension-core/background import above
  // This callback runs when the service worker starts
  // eslint-disable-next-line no-console
  console.log("[Talisman] Background script initialized")
})
