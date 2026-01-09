// WXT Background Script Entry Point
// Imports the main background logic from extension-core

// Import the background module - this is a side-effect module that initializes the extension
// The import must happen at the top level, not inside defineBackground callback
import "extension-core/background"

export default defineBackground({
  // Use ES modules for the service worker - this allows code splitting/chunking
  // Required to keep individual files under the 4MB store limit
  // Supported in Chrome 121+, Firefox 128+
  type: "module",

  main() {
    // Background initialization is handled by extension-core/background import above
    // This callback runs when the service worker starts
    // eslint-disable-next-line no-console
    console.log("[Talisman] Background script initialized")
  },
})
