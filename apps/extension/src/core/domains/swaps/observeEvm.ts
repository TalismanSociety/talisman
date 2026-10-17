import { type Hex, type PublicClient, parseTransaction } from "viem"

import type { LegObservation, SentLeg } from "./types"

const receiptOrNull = (client: PublicClient, hash: Hex) =>
  client.getTransactionReceipt({ hash }).catch((err: unknown) => {
    if ((err as { name?: string }).name === "TransactionReceiptNotFoundError") return null
    throw err
  })

const transactionBody = async (client: PublicClient, sent: SentLeg) => {
  if (sent.evidence.platform === "ethereum" && sent.evidence.raw) {
    const { data = "0x", value = 0n } = parseTransaction(sent.evidence.raw)
    return { data, value }
  }
  const { input, value } = await client.getTransaction({ hash: sent.hash })
  return { data: input, value }
}

/**
 * A receipt in a finalised block settles an EVM leg either way. Without one, the signer's nonce
 * at the finalised block tells a replaced leg from a pending one: a nonce past the leg's was
 * consumed for good by another transaction.
 */
export const observeEvmLeg = async (
  client: PublicClient,
  sent: SentLeg,
  signer: Hex,
  landedAmount: (body: { data: Hex; value: bigint }) => bigint
): Promise<LegObservation> => {
  const finalised = (await client.getBlock({ blockTag: "finalized" })).number
  const [receipt, nonceAfter] = await Promise.all([
    receiptOrNull(client, sent.hash),
    client.getTransactionCount({ address: signer, blockNumber: finalised }),
  ])

  if (receipt) {
    if (receipt.blockNumber > finalised) return { status: "pending" }
    if (receipt.status !== "success") return { status: "failed", reason: "reverted" }
    return { status: "landed", amount: landedAmount(await transactionBody(client, sent)) }
  }
  if (nonceAfter > sent.nonce) return { status: "failed", reason: "replaced" }
  return { status: "pending" }
}
