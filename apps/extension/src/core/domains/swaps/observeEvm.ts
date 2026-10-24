import { type Hex, type PublicClient, parseTransaction } from "viem"

import type { LegObservation, SentLeg } from "./types"

const nullWhen =
  (notFoundError: string) =>
  (err: unknown): null => {
    if ((err as { name?: string }).name === notFoundError) return null
    throw err
  }

const receiptOrNull = (client: PublicClient, hash: Hex) =>
  client.getTransactionReceipt({ hash }).catch(nullWhen("TransactionReceiptNotFoundError"))

const transactionOrNull = (client: PublicClient, hash: Hex) =>
  client.getTransaction({ hash }).catch(nullWhen("TransactionNotFoundError"))

const transactionBody = async (client: PublicClient, sent: SentLeg) => {
  if (sent.evidence.platform === "ethereum" && sent.evidence.raw) {
    const { data = "0x", value = 0n } = parseTransaction(sent.evidence.raw)
    return { data, value }
  }
  const { input, value } = await client.getTransaction({ hash: sent.hash })
  return { data: input, value }
}

/**
 * A receipt in a finalised block settles an EVM leg either way. Without one, a signer's nonce past
 * the leg's at the finalised block, read before the receipt, with the hash unknown to the node,
 * means another transaction consumed it for good. A lagging fallback node can miss a receipt another one has, so only a node that answers
 * "not found" for the hash makes the leg replaced: any other failure is thrown for a later observation.
 */
export const observeEvmLeg = async (
  client: PublicClient,
  sent: SentLeg,
  signer: Hex,
  landedAmount: (body: { data: Hex; value: bigint }) => bigint
): Promise<LegObservation> => {
  const finalised = (await client.getBlock({ blockTag: "finalized" })).number
  const nonceAfter = await client.getTransactionCount({ address: signer, blockNumber: finalised })
  const receipt = await receiptOrNull(client, sent.hash)

  if (receipt) {
    if (receipt.blockNumber > finalised) return { status: "pending" }
    if (receipt.status !== "success") return { status: "failed", reason: "reverted" }
    return { status: "landed", amount: landedAmount(await transactionBody(client, sent)) }
  }
  if (nonceAfter <= sent.nonce) return { status: "pending" }
  const known = await transactionOrNull(client, sent.hash)
  return known ? { status: "pending" } : { status: "failed", reason: "replaced" }
}
