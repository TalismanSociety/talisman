import { TAO_DECIMALS } from "@talismn/balances"
import {
  type NetworkId,
  parseTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"

/** null for a token that is not a subnet's, or a position's on one */
export const parseDTaoTokenId = (tokenId: TokenId | null | undefined) => {
  try {
    const parsed = tokenId ? parseTokenId(tokenId) : null
    return parsed?.type === "substrate-dtao" ? parsed : null
  } catch {
    return null
  }
}

type DTaoLegBase = {
  networkId: NetworkId
  netuid: number
  dTaoTokenId: TokenId
  taoTokenId: TokenId
}

/**
 * A trade between TAO and a subnet, as its two token ids describe it. The validator is the hotkey
 * of the position's token: a stake into a subnet's own token has none chosen yet.
 */
export type DTaoLeg = DTaoLegBase &
  ({ direction: "stake"; hotkey: string | null } | { direction: "unstake"; hotkey: string })

/** null for a pair that does not trade a subnet against its network's TAO, or unstakes from no position */
export const parseDTaoLeg = (
  fromTokenId: TokenId | null | undefined,
  toTokenId: TokenId | null | undefined
): DTaoLeg | null => {
  if (!fromTokenId || !toTokenId) return null
  const [from, to] = [parseDTaoTokenId(fromTokenId), parseDTaoTokenId(toTokenId)]
  const dTao = from ?? to
  if (!dTao || (from && to)) return null

  const taoTokenId = subNativeTokenId(dTao.networkId)
  const base = { networkId: dTao.networkId, netuid: dTao.netuid, taoTokenId }
  if (to)
    return fromTokenId === taoTokenId
      ? { ...base, direction: "stake", hotkey: to.hotkey ?? null, dTaoTokenId: toTokenId }
      : null
  return toTokenId === taoTokenId && dTao.hotkey
    ? { ...base, direction: "unstake", hotkey: dTao.hotkey, dTaoTokenId: fromTokenId }
    : null
}

/** rao the trade pays or returns per alpha, every fee included: 0 when it moves no alpha */
export const getLegAlphaRate = (
  { direction }: Pick<DTaoLeg, "direction">,
  { inputAmount, outputAmount }: { inputAmount: bigint; outputAmount: bigint }
): bigint => {
  const [tao, alpha] =
    direction === "stake" ? [inputAmount, outputAmount] : [outputAmount, inputAmount]
  return alpha > 0n ? (tao * 10n ** TAO_DECIMALS) / alpha : 0n
}
