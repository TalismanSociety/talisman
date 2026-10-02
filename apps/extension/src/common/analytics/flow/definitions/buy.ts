import { BUY_ENTRIES } from "../../funds"
import { defineFlow } from "../defineFlow"

export const buy = defineFlow("buy", {
  subject: "buying or selling crypto through a ramp provider",
  steps: ["buy", "sell"],
  entries: BUY_ENTRIES,
  extras: {
    started: { tab: "required" },
    completed: {
      provider: "required",
      fiat_currency: "required",
      token_symbol: "required",
      network_id: "required",
      direction: "required",
    },
  },
  omit: ["submitted"],
  rename: { started: "buy_opened", completed: "buy_provider_launched" },
})
