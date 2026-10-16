import { hex } from "@scure/base"
import { Transaction } from "@scure/btc-signer"

export type FinalizedTransaction = {
  txHex: string
  txid: string
  vsize: number
  feeSats: bigint
}

export const finalizeAndExtract = (psbt: Uint8Array): FinalizedTransaction => {
  const tx = Transaction.fromPSBT(psbt)
  tx.finalize()
  return {
    txHex: hex.encode(tx.extract()),
    txid: tx.id,
    vsize: tx.vsize,
    feeSats: tx.fee,
  }
}
