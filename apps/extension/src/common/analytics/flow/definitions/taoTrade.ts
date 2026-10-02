import { z } from "zod/v4"

import { RAMP_DIRECTIONS } from "../../funds"
import { defineFlow } from "../defineFlow"

/** The buy and sell panel of a TAO dashboard subnet page. It starts when the user types an amount. */
export const taoTrade = defineFlow("tao_trade", {
  subject: "trading subnet alpha on the TAO dashboard",
  steps: ["amount", "confirm"],
  attributes: { direction: { narrow: z.enum(RAMP_DIRECTIONS) }, netuid: "required" },
  extras: {
    submitted: {
      network_id: "required",
      symbol: "required",
      signer: "required",
      usd_bucket: "required",
      slippage_percent: "required",
      slippage_is_default: "required",
      mev_shield: "required",
    },
  },
  settlement: "transaction",
})
