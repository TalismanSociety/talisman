import { SUBMITTERS } from "../../transactions"
import { defineFlow } from "../defineFlow"

/**
 * Signing with Polkadot Vault over QR codes. The request or transaction it signs reports its own
 * outcome: this flow shows where the QR exchange stalls.
 */
export const vaultSign = defineFlow("vault_sign", {
  subject: "signing with Polkadot Vault by QR code",
  steps: ["show_qr", "update_metadata", "scan_signature"],
  entries: SUBMITTERS,
  omit: ["submitted", "failed"],
})
