import type { TokenId } from "@talismn/chaindata-provider"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useMemo } from "react"

export type FeeBalanceStatus = "loading" | "sufficient" | "insufficient" | "unknown"

export type FeeBalanceCheckResult = {
  status: FeeBalanceStatus
  feeTokenId: TokenId | null
  /** Estimated fee in planck. `null` while fee is still loading. */
  required: bigint | null
  /** User's available fee-token balance in planck. `null` while loading. */
  available: bigint | null
}

type UseFeeBalanceCheckParams = {
  /** Address of the account paying for the transaction. */
  fromAddress: string | null | undefined
  /** Token ID of the chain's native/fee token (e.g. SOL, DOT, ETH). */
  feeTokenId: TokenId | null | undefined
  /** Estimated fee in planck (as string or bigint). `null` while still estimating. */
  feePlanck: string | bigint | null
  /** Whether the fee estimate is still loading. */
  isFeeLoading: boolean
  /** Token ID the user is swapping FROM. Used to detect the native-token edge case. */
  fromTokenId: TokenId | null | undefined
  /** Amount the user is swapping, in planck. */
  fromAmount: bigint | null
}

/**
 * Checks whether the user has enough native tokens to pay for transaction fees.
 *
 * When the swap token IS the fee token (e.g. swapping SOL on Solana), the check
 * accounts for both the swap amount and the fee being drawn from the same balance.
 *
 * Returns a tri-state status:
 * - `"loading"` — fee or balance is not yet known
 * - `"sufficient"` — user has enough for fees
 * - `"insufficient"` — user does NOT have enough for fees
 * - `"unknown"` — not enough data to determine (e.g. no address / no fee token)
 */
export const useFeeBalanceCheck = ({
  fromAddress,
  feeTokenId,
  feePlanck,
  isFeeLoading,
  fromTokenId,
  fromAmount,
}: UseFeeBalanceCheckParams): FeeBalanceCheckResult => {
  const addressesAndTokens = useMemo(
    () => ({
      addresses: fromAddress ? [fromAddress] : [],
      tokenIds: feeTokenId ? [feeTokenId] : [],
    }),
    [fromAddress, feeTokenId]
  )

  // Use useBalancesByParams directly to access subscription status.
  // useBalanceByParams only returns the balance itself, so we can't distinguish
  // "still initialising" from "no balance found" (both return null).
  // When the subscription is "live" but no balance entry exists (e.g. 0 SOL account),
  // available should be 0n — not "loading" forever.
  const { status: balanceStatus, balances } = useBalancesByParams({ addressesAndTokens })

  const feeTokenBalance = useMemo(() => {
    if (!fromAddress || !feeTokenId) return null
    return balances.find({ address: fromAddress, tokenId: feeTokenId }).each[0] ?? null
  }, [balances, fromAddress, feeTokenId])

  return useMemo<FeeBalanceCheckResult>(() => {
    if (!feeTokenId || !fromAddress) {
      return { status: "unknown", feeTokenId: feeTokenId ?? null, required: null, available: null }
    }

    // Fee not yet estimated
    if (isFeeLoading || feePlanck === null) {
      return { status: "loading", feeTokenId, required: null, available: null }
    }

    // Balance subscription still initialising — wait for it
    if (balanceStatus === "initialising") {
      return { status: "loading", feeTokenId, required: null, available: null }
    }

    // Subscription is live: if no balance entry exists, the account has 0 of this token
    const available = feeTokenBalance?.transferable.planck ?? 0n

    const fee = typeof feePlanck === "string" ? BigInt(feePlanck) : feePlanck

    // When swapping the native token itself, both the swap amount and the fee
    // come from the same balance pool.
    const isNativeSwap = fromTokenId === feeTokenId
    const totalRequired = isNativeSwap ? (fromAmount ?? 0n) + fee : fee

    const status: FeeBalanceStatus = totalRequired > available ? "insufficient" : "sufficient"

    return { status, feeTokenId, required: fee, available }
  }, [
    feeTokenId,
    fromAddress,
    feeTokenBalance,
    balanceStatus,
    isFeeLoading,
    feePlanck,
    fromTokenId,
    fromAmount,
  ])
}
