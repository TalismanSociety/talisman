import { z } from "zod/v4"

import { AMOUNT_FORM_STATES } from "../../formState"
import { RAMP_DIRECTIONS } from "../../funds"
import { defineFlow } from "../defineFlow"

export const taoTrade = defineFlow("tao_trade", {
  subject: "trading subnet alpha on the TAO dashboard",
  steps: ["amount", "confirm"],
  attributes: {
    direction: { narrow: z.enum(RAMP_DIRECTIONS) },
    netuid: "required",
    form_state: { narrow: z.enum(AMOUNT_FORM_STATES) },
  },
  extras: {
    submitted: {
      network_id: "required",
      symbol: "required",
      signer: "required",
      usd_bucket: "required",
      slippage_percent: "required",
      slippage_is_default: "required",
      mev_shield: "required",
      used_max: "required",
    },
  },
  settlement: "transaction",
})
