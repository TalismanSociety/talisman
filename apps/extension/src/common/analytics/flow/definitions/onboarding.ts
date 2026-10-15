import { defineFlow } from "../defineFlow"

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
