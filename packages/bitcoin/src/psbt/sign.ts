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

/**
 * A partial signature returned by a hardware device (ledger-bitcoin PartialSignature shape).
 * `tapleafHash` is present for taproot script-path spends (unused for our key-path singlesig).
 */
export type HardwarePartialSignature = {
  inputIndex: number
  pubkey: Uint8Array
  signature: Uint8Array
  tapleafHash?: Uint8Array
}

/**
 * Attaches hardware-produced partial signatures to a PSBT so it can be finalized.
 * P2WPKH inputs get an ECDSA partialSig; P2TR key-path inputs get a Schnorr tapKeySig.
 */
export const attachPartialSignatures = (
  psbt: Uint8Array,
  signatures: HardwarePartialSignature[]
): Uint8Array => {
  const tx = Transaction.fromPSBT(psbt)

  for (const { inputIndex, pubkey, signature } of signatures) {
    const input = tx.getInput(inputIndex)
    if (input.tapInternalKey) {
      // taproot key-path: 64-byte (or 65 with sighash) schnorr signature
      tx.updateInput(inputIndex, { tapKeySig: signature })
    } else {
      // p2wpkh: BIP174 partialSig is [pubkey, DER-encoded ecdsa sig + sighash byte]
      tx.updateInput(inputIndex, { partialSig: [[pubkey, signature]] })
    }
  }

  return tx.toPSBT()
}
