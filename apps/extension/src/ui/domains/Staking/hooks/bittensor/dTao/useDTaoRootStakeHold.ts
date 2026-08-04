import { type Balance, findDTaoRootStakeHold } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { getBlockTimeMs } from "@ui/domains/Staking/Bittensor/utils/helpers"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

const MIN_REFETCH_INTERVAL_MS = 3_000

export type DTaoRootStakeHold = {
  unlockAtBlock: number
  /** estimated ms until the hold expires; null until the current block is known */
  remainingMs: number | null
}

/**
 * Root-stake hold window (spec 441): while active, the balance's root stake cannot leave
 * root — unstake/move/swap/transfer would fail with `RootStakeLocked`. Pass a null balance
 * to disable (eg when the flow doesn't target a root position).
 *
 * Only queries the chain while the balance actually carries hold meta — never, as long as
 * the chain's `RootStakeUnlockInterval` stays 0 (its current value).
 */
export const useDTaoRootStakeHold = ({
  networkId,
  balance,
}: {
  networkId: DotNetworkId | null | undefined
  balance: Balance | null | undefined
}): DTaoRootStakeHold | null => {
  const hold = useMemo(() => findDTaoRootStakeHold(balance?.toJSON()), [balance])

  const { data: sapi } = useScaleApi(hold ? networkId : null)
  const blockTimeMs = useMemo(() => (sapi ? getBlockTimeMs(sapi) : null), [sapi])

  const { data: currentBlock } = useQuery({
    queryKey: ["useDTaoRootStakeHold", sapi?.chainId, hold?.unlockAtBlock],
    queryFn: () => sapi?.getStorage<number>("System", "Number", []) ?? null,
    enabled: !!sapi && !!hold,
    refetchInterval: Math.max(blockTimeMs ?? MIN_REFETCH_INTERVAL_MS, MIN_REFETCH_INTERVAL_MS),
  })

  return useMemo(() => {
    if (!hold) return null
    if (typeof currentBlock !== "number" || !blockTimeMs)
      return { unlockAtBlock: hold.unlockAtBlock, remainingMs: null }
    const remainingBlocks = hold.unlockAtBlock - currentBlock
    // expired since the last balances poll: the chain no longer restricts the pair
    if (remainingBlocks <= 0) return null
    return { unlockAtBlock: hold.unlockAtBlock, remainingMs: remainingBlocks * blockTimeMs }
  }, [hold, currentBlock, blockTimeMs])
}

/** User-facing explanation of an active hold, ready to use as a form error message */
export const useDTaoRootStakeHoldMessage = (hold: DTaoRootStakeHold | null): string | null => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  return useMemo(() => {
    if (!hold) return null
    if (!hold.remainingMs) return t("Root stake is temporarily locked after staking or claiming")
    const duration = formatDuration(intervalToDuration({ start: 0, end: hold.remainingMs }), {
      locale,
    })
    return t("Root stake is locked for {{duration}} after staking or claiming", { duration })
  }, [hold, t, locale])
}
