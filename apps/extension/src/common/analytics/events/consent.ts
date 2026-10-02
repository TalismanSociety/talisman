import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const consentEvents = defineEventGroup(properties, {
  analytics_opt_in: {
    description:
      "Usage analytics turned on, from the onboarding privacy step (source onboarding) or from settings (source settings).",
    props: { source: "required" },
  },
})
