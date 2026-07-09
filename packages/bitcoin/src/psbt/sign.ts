import { Transaction } from "@scure/btc-signer"

/**
 * Signs specific PSBT inputs with their matching child private keys.
 * Taproot inputs (tapInternalKey present) are tweaked internally by btc-signer;
 * pass the untweaked child key for those too.
 */
export const signPsbtWithKeys = (
  psbt: Uint8Array,
  keys: Array<{ inputIndex: number; secretKey: Uint8Array }>
): Uint8Array => {
  const tx = Transaction.fromPSBT(psbt)
  for (const { inputIndex, secretKey } of keys) tx.signIdx(secretKey, inputIndex)
  return tx.toPSBT()
}
