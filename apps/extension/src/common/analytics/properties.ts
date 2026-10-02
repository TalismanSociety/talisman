import { p } from "./schema"

export const properties = {
  source: p.enum(["onboarding", "settings"], "Where the user made the choice."),
} as const
