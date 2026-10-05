import { z } from "zod/v4"

import { RECEIVE_ENTRIES } from "../funds"
import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const fundsEvents = defineEventGroup(properties, {
  swap_quote_received: {
    description:
      "Swap quotes came back for one amount and token pair, once every provider answered. Not sent again when they refresh.",
    props: { quote_count: "required", protocols: "required", latency_ms: "required" },
  },
  swap_quote_failed: {
    description:
      "A swap provider failed to quote for one amount and token pair, once per provider when every provider answered.",
    props: {
      protocol: "required",
      error_category: "required",
      from_network_id: "required",
      to_network_id: "required",
      from_symbol: "required",
      to_symbol: "required",
    },
  },
  swap_approval_submitted: {
    description:
      "The user sent the token approval a swap needs before the swap itself, or the revoke some tokens need first.",
    props: { protocol: "required", network_id: "required", is_revoke: "required" },
  },
  tx_replace_requested: {
    description:
      "The user sent a speed-up or a cancel for a pending Ethereum transaction. Mobile sends it when its replace screen opens: here modal_opened covers the open.",
    props: { replace_type: "required", platform: "required", network_id: "required" },
  },
  fee_priority_changed: {
    description:
      "The user picked another EVM fee priority, or saved custom gas values, in a send, a swap, a dapp request or an Earn transaction.",
    props: { fee_priority: "required", network_id: "required", gas_type: "required" },
  },
  allowance_edited: {
    description: "The user set another spending limit on an ERC-20 approval a dapp asked to sign.",
    props: { network_id: "required" },
  },
  contact_added: {
    description: "The user saved an address book contact.",
    props: {
      source: { narrow: z.enum(["send", "address_book"]) },
      platform: "required",
      has_network: "required",
      name_service: "required",
    },
  },
  contact_edited: {
    description: "The user saved changes to an address book contact.",
    props: { network_changed: "required" },
  },
  contact_deleted: {
    description: "The user deleted an address book contact.",
    props: {},
  },
  address_copied: {
    description:
      "The user copied an address straight from a receive or copy button, without the receive steps: the account and its format were already known.",
    props: {
      entry: { narrow: z.enum(RECEIVE_ENTRIES) },
      network_id: "required",
      address_format: "required",
    },
  },
})
