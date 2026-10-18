import { z } from "zod/v4"

import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const stakingEvents = defineEventGroup(properties, {
  staking_subnet_selected: {
    description: "The user picked the subnet to stake into in the Bittensor staking modal.",
    props: { netuid: "required", is_root: "required" },
  },
  staking_validator_selected: {
    description:
      "The user picked a validator in the Bittensor validator list, from the staking modal or the TAO dashboard.",
    props: {
      is_default: "required",
      is_featured: "required",
      is_root: "required",
      sort: "required",
      searched: "required",
      position: "required",
    },
  },
  staking_mev_shield_toggled: {
    description:
      "The user turned MEV Shield on or off before a Bittensor stake or unstake, in the staking modal or the TAO dashboard.",
    props: { enabled: "required", direction: { narrow: z.enum(["stake", "unstake"]) } },
  },
  mev_shield_window_missed: {
    description:
      "A Ledger MEV Shield submit sent nothing because its window closed: only the author of the block two after the key was read can decrypt the wrapper. The user can approve the wrapper again without signing the transaction again.",
    props: { closed_during: "required" },
  },
  staking_slippage_changed: {
    description:
      "The user saved the slippage tolerance for subnet staking, which applies to every subnet.",
    props: { slippage_percent: "required", preset: "required", is_default: "required" },
  },
  earn_position_opened: {
    description:
      "An Earn position page opened. yield_id names the yield.xyz product, which the route pattern drops.",
    props: { system: "required", yield_id: "required" },
  },
  earn_token_selected: {
    description:
      "The user picked a token in the token picker that opens an Earn deposit, before they pick a product for it.",
    props: {
      searched: "required",
      position: "required",
      token_id: "required",
      symbol: "required",
      network_id: "required",
    },
  },
})
