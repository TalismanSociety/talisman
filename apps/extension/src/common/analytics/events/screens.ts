import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const screenEvents = defineEventGroup(properties, {
  $screen: {
    description:
      "A screen shown in a page: a route named by its pattern, or a shell screen (/login, /locked, /migrating, /phishing-page-detected/:url). Once per pattern change: a change of query or param value alone sends nothing. The last screen's dwell is never sent, because a closing page runs no code.",
    props: {
      $screen_name: "required",
      previous_screen_name: "optional",
      previous_dwell_ms: "optional",
    },
  },
})
