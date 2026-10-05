import { defineFlow } from "../defineFlow"

export const passwordChange = defineFlow("password_change", {
  subject: "changing the wallet password",
  steps: [{ name: "form", screen: "/settings/security-privacy-settings/change-password" }],
  rename: { completed: "password_changed" },
})
