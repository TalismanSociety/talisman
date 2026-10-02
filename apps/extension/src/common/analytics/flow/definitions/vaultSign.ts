import { SUBMITTERS } from "../../transactions"
import { defineFlow } from "../defineFlow"

export const vaultSign = defineFlow("vault_sign", {
  subject: "signing with Polkadot Vault by QR code",
  steps: ["show_qr", "update_metadata", "scan_signature"],
  entries: SUBMITTERS,
  omit: ["submitted", "failed"],
  finishesOverlay: false,
})
