import { z } from "zod/v4"

import { properties } from "../properties"
import { defineEventGroup } from "../schema"

const source = { narrow: z.enum(["dapp", "settings"]) }

export const networkTokenEvents = defineEventGroup(properties, {
  custom_network_saved: {
    description:
      "The user added a network that is not in Talisman's network list, or edited a network. Editing a network from Talisman's list saves the user's own copy of it. network_id: Talisman's id for a network from its list, custom for a network the user added.",
    props: {
      mode: { narrow: z.enum(["add", "edit"]) },
      platform: "required",
      network_id: "required",
      testnet: "required",
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
  custom_network_deleted: {
    description:
      "The user removed a network they added, or reset a network from Talisman's list to Talisman's own copy. network_id as on custom_network_saved.",
    props: { network_id: "required", platform: "required" },
  },
  custom_token_edited: {
    description:
      "The user saved changes to a token in settings. Editing a token from Talisman's list saves the user's own copy of it.",
    props: { network_id: "required", token_symbol: "required" },
  },
  custom_token_deleted: {
    description:
      "The user removed a token they added, or reset a token from Talisman's list to Talisman's own copy.",
    props: { network_id: "required" },
  },
  networks_deactivated: {
    description: "The user turned networks off in bulk, from Deactivate networks in settings.",
    props: { count: "required", unused_only: "required" },
  },
  networks_reset: {
    description:
      "The user reset which networks are on to Talisman's defaults, for one platform or all of them.",
    props: { count: "required" },
  },
  tokens_reset: {
    description: "The user reset which tokens are on to Talisman's defaults.",
    props: { count: "required" },
  },
})
