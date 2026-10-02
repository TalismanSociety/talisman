import { z } from "zod/v4"

import { properties } from "../properties"
import { defineEventGroup } from "../schema"

const source = { narrow: z.enum(["dapp"]) }

/**
 * Mobile's names. Token ids stay on the device: an ERC-20 id holds its contract address, so the
 * symbol and network name the token instead.
 */
export const networkTokenEvents = defineEventGroup(properties, {
  custom_network_saved: {
    description:
      "The user added a network that is not in Talisman's network list. network_id is the id the network was saved under: the chain id for an Ethereum network.",
    props: {
      mode: "required",
      platform: "required",
      network_id: "required",
      testnet: "required",
      rpc_provider: "required",
      source,
    },
  },
  network_toggled: {
    description: "The user turned a network from Talisman's network list on or off.",
    props: {
      network_id: "required",
      platform: "required",
      enabled: "required",
      default_enabled: "required",
      source,
    },
  },
  custom_token_added: {
    description: "The user added a token that is not in Talisman's token list.",
    props: {
      network_id: "required",
      token_symbol: "required",
      has_coingecko_id: "required",
      source,
    },
  },
  token_toggled: {
    description: "The user turned a token from Talisman's token list on or off.",
    props: {
      network_id: "required",
      token_symbol: "required",
      enabled: "required",
      default_enabled: "required",
      source,
    },
  },
})
