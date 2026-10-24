import { type Hex, type PublicClient, parseTransaction } from "viem"

import { type LegCandidate, legCandidates } from "./candidates"
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

const transactionBody = async (client: PublicClient, candidate: LegCandidate) => {
  if (candidate.raw) {
    const { data = "0x", value = 0n } = parseTransaction(candidate.raw)
    return { data, value }
  }
  const { input, value } = await client.getTransaction({ hash: candidate.hash })
  return { data: input, value }
}

const findMined = async (client: PublicClient, candidates: LegCandidate[]) => {
  const mined = await Promise.all(
    candidates.map(async (candidate) => {
      const receipt = await receiptOrNull(client, candidate.hash)
      return receipt ? [{ candidate, receipt }] : []
    })
  )
  return mined.flat()[0] ?? null
}

/**
 * The leg's own transaction and the user's speed-ups and cancels share its nonce, so at most one
 * of them executes. A receipt in a finalised block settles the leg by whichever one it belongs to.
 * Without one, a signer's nonce past the leg's at the finalised block, read before the receipts,
 * with every hash unknown to the node, means another transaction consumed it for good. A lagging
 * fallback node can miss a receipt another one has, so only a node that answers "not found" for
 * every hash makes the leg replaced: any other failure is thrown for a later observation.
 */
export const observeEvmLeg = async (
  client: PublicClient,
  sent: SentLeg,
  signer: Hex,
  landedAmount: (body: { data: Hex; value: bigint }) => bigint
): Promise<LegObservation> => {
  const finalised = (await client.getBlock({ blockTag: "finalized" })).number
  const nonceAfter = await client.getTransactionCount({ address: signer, blockNumber: finalised })
  const candidates = legCandidates(sent)
  const mined = await findMined(client, candidates)

  if (mined) {
    const { candidate, receipt } = mined
    if (receipt.blockNumber > finalised) return { status: "pending" }
    if (receipt.status !== "success")
      return { status: "failed", reason: "reverted", hash: candidate.hash }
    if (candidate.kind === "cancel")
      return { status: "failed", reason: "cancelled", hash: candidate.hash }
    return {
      status: "landed",
      hash: candidate.hash,
      amount: landedAmount(await transactionBody(client, candidate)),
    }
  }
  if (nonceAfter <= sent.nonce) return { status: "pending" }
  const known = await Promise.all(
    candidates.map((candidate) => transactionOrNull(client, candidate.hash))
  )
  return known.some(Boolean) ? { status: "pending" } : { status: "failed", reason: "replaced" }
}
