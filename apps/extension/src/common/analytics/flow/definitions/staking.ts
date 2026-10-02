import { z } from "zod/v4"

import { STAKING_ACTIONS, STAKING_ENTRIES } from "../../staking"
import { defineFlow } from "../defineFlow"

const action = { narrow: z.enum(STAKING_ACTIONS) }

/**
 * Every staking modal: Bittensor, nomination pools and SEEK. mode and direction name the action;
 * the worker completes it when the transaction settles. With MEV Shield the linked transaction is
 * the inner one, the staking call itself.
 */
export const staking = defineFlow("staking", {
  subject: "a staking action",
  steps: ["subnet", "position", "validator", "hotkey", "form", "review"],
  entries: STAKING_ENTRIES,
  attributes: {
    staking_type: "required",
    direction: action,
    netuid: "optional",
  },
  extras: {
    started: { mode: action },
    submitted: {
      network_id: "required",
      symbol: "required",
      signer: "required",
      usd_bucket: "required",
      slippage_percent: "required",
      slippage_is_default: "required",
      mev_shield: "optional",
    },
  },
  settlement: "transaction",
})
