import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const overlayEvents = defineEventGroup(properties, {
  modal_opened: {
    description: "A modal or drawer appeared on screen.",
    props: { modal_id: "required" },
  },
  modal_closed: {
    description:
      "A modal or drawer left the screen. Not sent when the page itself closes with it open (the popup losing focus): a modal_opened with no modal_closed ended that way.",
    props: { modal_id: "required", dismiss: "required", duration_ms: "required" },
  },
})
