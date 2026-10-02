import { defineFlow } from "../defineFlow"

/**
 * Mobile's onboarding ends with the first account, which the extension adds after these screens:
 * the background sends `onboarding_completed` then, so this flow's end takes another name.
 */
export const onboarding = defineFlow("onboarding", {
  subject: "setting up the wallet",
  steps: [
    { name: "welcome", screen: "/" },
    { name: "password", screen: "/password" },
    { name: "privacy", screen: "/privacy" },
  ],
  entries: ["install", "reset"],
  extras: { submitted: { biometrics_offered: "required" } },
  rename: { submitted: "password_set", completed: "onboarding_setup_completed" },
})
