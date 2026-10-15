import { defineFlow } from "../defineFlow"

export const recoveryPhraseBackup = defineFlow("recovery_phrase_backup", {
  subject: "backing up a recovery phrase",
  steps: ["acknowledgement", "show", "verify"],
  entries: ["settings", "reminder"],
  extras: { completed: { verified: "required" } },
})
