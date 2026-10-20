import { z } from "zod/v4"

import { AMOUNT_FORM_STATES } from "../../formState"
import { STAKING_ACTIONS, STAKING_ENTRIES } from "../../staking"
import { defineFlow } from "../defineFlow"

const action = { narrow: z.enum(STAKING_ACTIONS) }

export const staking = defineFlow("staking", {
  subject: "a staking action",
  steps: ["subnet", "position", "validator", "hotkey", "form", "review"],
  entries: STAKING_ENTRIES,
  attributes: {
    staking_type: "required",
    direction: action,
    netuid: "optional",
    form_state: { narrow: z.enum(AMOUNT_FORM_STATES), optional: true },
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
      used_max: "optional",
    },
  },
  settlement: "transaction",
})
