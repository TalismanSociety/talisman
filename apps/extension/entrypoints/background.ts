// WXT Background Script Entry Point
// Imports the main background logic from extension-core

export default defineBackground(() => {
  // Extension-core handles all background script initialization
  // Import the background module which is a side-effect module that initializes the extension
  import("extension-core/background")
})
