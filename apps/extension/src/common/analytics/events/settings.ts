import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const settingsEvents = defineEventGroup(properties, {
  setting_changed: {
    description:
      "The user changed an allow-listed setting or a Don't show again choice, from any screen. Once per change of the stored value.",
    props: { key: "required", value: "required" },
  },
  language_changed: {
    description: "The user picked another language for the wallet.",
    props: { language_code: "required" },
  },
  auto_lock_changed: {
    description: "The user changed the auto-lock timer.",
    props: { timeout_ms: "required" },
  },
})
