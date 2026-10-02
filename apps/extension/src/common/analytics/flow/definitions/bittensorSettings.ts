import { defineFlow } from "../defineFlow"

/** The Bittensor account settings modal: accepting incoming conviction-locked transfers. */
export const bittensorSettings = defineFlow("bittensor_settings", {
  subject: "changing a Bittensor account setting",
  steps: ["form"],
  extras: { submitted: { enabled: "required", signer: "required" } },
  settlement: "transaction",
})
