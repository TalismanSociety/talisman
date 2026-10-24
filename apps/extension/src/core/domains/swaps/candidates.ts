import type { Hex } from "viem"

import type { LegReplacement, NonEmpty, SentEvidence } from "./types"

/** a transaction sent on a leg's nonce: the leg's own, or one of the user's replacements */
export type LegCandidate = { kind: "original" | LegReplacement["kind"]; hash: Hex; raw?: Hex }

type Sent = { hash: Hex; evidence: SentEvidence }

/** the leg's own transaction first, then the user's replacements in the order they were sent */
export const legCandidates = ({ hash, evidence }: Sent): NonEmpty<LegCandidate> =>
  evidence.platform === "ethereum"
    ? [{ kind: "original", hash, raw: evidence.raw }, ...(evidence.replacements ?? [])]
    : [{ kind: "original", hash }]

/** the transaction the leg was last sent as, the one a pending leg is followed and resent by */
export const latestCandidate = (sent: Sent): LegCandidate => {
  const candidates = legCandidates(sent)
  return candidates[candidates.length - 1]
}
