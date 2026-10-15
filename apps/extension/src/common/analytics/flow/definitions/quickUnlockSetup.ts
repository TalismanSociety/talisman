import { defineFlow } from "../defineFlow"

export const quickUnlockSetup = defineFlow("quick_unlock_setup", {
  subject: "turning on Quick Unlock",
  steps: ["passkey", "enrol"],
  rename: { completed: "quick_unlock_enabled" },
})
