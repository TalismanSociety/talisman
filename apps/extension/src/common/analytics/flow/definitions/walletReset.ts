import { defineFlow } from "../defineFlow"

export const walletReset = defineFlow("wallet_reset", {
  subject: "resetting the wallet after a forgotten password",
  steps: ["warning", "confirm"],
  omit: ["submitted", "failed"],
})
