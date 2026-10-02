import { z } from "zod/v4"

import { DAPP_METHODS } from "../dapp"
import { properties } from "../properties"
import { defineEventGroup } from "../schema"

const dappMethod = { narrow: z.enum(DAPP_METHODS) }

export const dappRequestEvents = defineEventGroup(properties, {
  dapp_request_received: {
    description:
      "A dapp request opened a request window: connect, sign in, sign, send, add a network or watch an asset.",
    props: {
      method: dappMethod,
      platform: "required",
      wallet_locked: "required",
      site_flagged: "required",
    },
  },
  dapp_request_resolved: {
    description:
      "A dapp request ended. Once per request. A service worker restart loses pending requests without this event.",
    props: {
      method: dappMethod,
      platform: "required",
      outcome: "required",
      time_to_decision_ms: "required",
      risk_verdict: "required",
      error_category: "optional",
    },
  },
})
