import { z } from "zod/v4"

import { DAPP_METHODS } from "../dapp"
import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const performanceEvents = defineEventGroup(properties, {
  popup_opened: {
    description:
      "A popup page painted its first screen: the toolbar popup, or a window the wallet opened (ui_context popup_window). $screen_name is that screen.",
    props: { time_to_interactive_ms: "required" },
  },
  balances_loaded: {
    description:
      "Balances stopped initialising for the first time in a page that shows them, measured from the unlock seen in that page, or from the page load when it opened unlocked.",
    props: { duration_ms: "required", ready_at_unlock: "required" },
  },
  dapp_request_rendered: {
    description: "A request window painted the request for the first time.",
    props: {
      method: { narrow: z.enum(DAPP_METHODS) },
      platform: "required",
      render_ms: "required",
      after_unlock: "required",
    },
  },
})
