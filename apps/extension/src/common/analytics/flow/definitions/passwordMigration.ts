import { defineFlow } from "../defineFlow"

export const passwordMigration = defineFlow("password_migration", {
  subject: "migrating the wallet password to its new format",
  steps: ["password", "backup", "new_password", "processing"],
})
