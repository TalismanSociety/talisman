import { z } from "zod/v4"

import { BUY_ENTRIES, RAMP_DIRECTIONS } from "../../funds"
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
      direction: { narrow: z.enum(RAMP_DIRECTIONS) },
    },
  },
  omit: ["submitted"],
  rename: { started: "buy_opened", completed: "buy_provider_launched" },
})
