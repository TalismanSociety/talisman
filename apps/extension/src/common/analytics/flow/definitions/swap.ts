import { z } from "zod/v4"

import { SWAP_ENTRIES } from "../../funds"
import { defineFlow } from "../defineFlow"

/**
 * The worker completes it: when the transaction fails on chain, or when the exchange the wallet
 * watches reaches its final status (swap_status).
 */
export const swap = defineFlow("swap", {
  subject: "swapping tokens",
  steps: ["form", "recipient", "confirm"],
  entries: SWAP_ENTRIES,
  extras: {
    started: { prefill_from_token: "required" },
    submitted: {
      protocol: "required",
      platform: "required",
      from_network_id: "required",
      to_network_id: "required",
      from_symbol: "required",
      to_symbol: "required",
      signer: "required",
      cross_chain: "required",
      usd_bucket: "required",
      fee_usd_bucket: "required",
      slippage_percent: "required",
      slippage_is_default: "required",
    },
    failed: { protocol: "required", phase: { narrow: z.enum(["approval", "submit"]) } },
    completed: { swap_status: "optional", protocol: "required", cross_chain: "required" },
  },
  settlement: "transaction",
  lastStepAlias: "stage",
})
