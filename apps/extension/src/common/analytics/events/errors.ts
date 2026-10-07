import { z } from "zod/v4"

import { ERROR_SURFACES, properties } from "../properties"
import { defineEventGroup } from "../schema"

export const errorEvents = defineEventGroup(properties, {
  error_shown: {
    description:
      "An error the user saw: an error toast, an inline field error appearing, an error sign alert, a blocking error screen, or the crash screen. Once per appearance, never its text. flow and flow_id name the flow attempt it happened in.",
    props: {
      surface: { narrow: z.enum(ERROR_SURFACES) },
      error_category: "required",
      flow: "optional",
      flow_id: "optional",
      field: "optional",
    },
  },
})
