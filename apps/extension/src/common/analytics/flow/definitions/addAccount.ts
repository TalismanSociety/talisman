import { z } from "zod/v4"

import { ACCOUNT_METHODS } from "../../accounts"
import { defineFlow } from "../defineFlow"

export const addAccount = defineFlow("add_account", {
  subject: "adding an account",
  steps: [
    { name: "menu", screen: "/accounts/add" },
    "form",
    "new_phrase",
    "connect_device",
    "select_accounts",
    "verifier_certificate",
  ],
  attributes: { method: { narrow: z.enum(ACCOUNT_METHODS), optional: true } },
})
