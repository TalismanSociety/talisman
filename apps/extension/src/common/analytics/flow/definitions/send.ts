import { z } from "zod/v4"

import { SEND_ENTRIES } from "../../funds"
import { defineFlow } from "../defineFlow"

export const send = defineFlow("send", {
  subject: "sending tokens",
  steps: [
    { name: "token", screen: "/send/token" },
    { name: "from", screen: "/send/from" },
    { name: "to", screen: "/send/to" },
    { name: "amount", screen: "/send/amount" },
    { name: "confirm", screen: "/send/confirm" },
  ],
  entries: SEND_ENTRIES,
  extras: {
    submitted: {
      platform: "required",
      network_id: "required",
      token_symbol: "required",
      signer: "required",
      fee_priority: "optional",
      usd_bucket: "required",
      fee_usd_bucket: "required",
      recipient_source: "required",
    },
    failed: {
      platform: "required",
      network_id: "required",
      phase: { narrow: z.enum(["pre_broadcast"]) },
      signer: "required",
    },
  },
  settlement: "transaction",
})
