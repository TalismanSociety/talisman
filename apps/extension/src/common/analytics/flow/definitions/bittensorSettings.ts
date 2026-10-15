import { defineFlow } from "../defineFlow"

export const bittensorSettings = defineFlow("bittensor_settings", {
  subject: "changing a Bittensor account setting",
  steps: ["form"],
  extras: { submitted: { enabled: "required", signer: "required" } },
  settlement: "transaction",
})
