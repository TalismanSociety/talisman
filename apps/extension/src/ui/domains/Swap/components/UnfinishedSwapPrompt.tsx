import type { UnfinishedSwap } from "@core/domains/app/store.app"
import { networkIdFromTokenId, type TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { Button } from "@ui/components/Button"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useAccountByAddress } from "@ui/state/accounts"
import { useAppState } from "@ui/state/app"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSwapModal } from "../hooks/useSwapModal"
import { clearUnfinishedSwap } from "../unfinishedSwaps"

const NO_SWAPS: UnfinishedSwap[] = []

const useLatestHeldSwap = (
  swaps: readonly UnfinishedSwap[],
  formFromTokenId: TokenId | null
): UnfinishedSwap | null => {
  const addressesAndTokens = useMemo(
    () => ({
      addresses: [...new Set(swaps.map((swap) => swap.fromAddress))],
      tokenIds: [...new Set(swaps.map((swap) => swap.fromTokenId))],
    }),
    [swaps]
  )
  const { balances } = useBalancesByParams({ addressesAndTokens })

  return useMemo(() => {
    for (const swap of [...swaps].reverse()) {
      if (swap.fromTokenId === formFromTokenId) continue
      const balance = balances.find(
        (balance) =>
          balance.tokenId === swap.fromTokenId && isAddressEqual(balance.address, swap.fromAddress)
      ).each[0]
      if (balance && balance.transferable.planck > 0n) return swap
    }
    return null
  }, [balances, formFromTokenId, swaps])
}

const FinishSwapPrompt: FC<{ swap: UnfinishedSwap }> = ({ swap }) => {
  const { t } = useTranslation()
  const { open: openSwapModal } = useSwapModal()
  const fromToken = useToken(swap.fromTokenId)
  const toToken = useToken(swap.toTokenId)
  const network = useNetworkById(networkIdFromTokenId(swap.fromTokenId))
  const account = useAccountByAddress(swap.fromAddress)

  return (
    <div className="flex flex-col gap-6 rounded bg-grey-900 p-8 text-xs">
      <div className="flex flex-col gap-2">
        <div className="font-bold text-body text-sm">{t("Finish your swap")}</div>
        <div className="text-body-secondary">
          {t(
            "Your swap to {{target}} stopped partway. Swap the {{symbol}} it left on {{account}} on {{network}} to finish it.",
            {
              symbol: fromToken?.symbol,
              account: account?.name ?? shortenAddress(swap.fromAddress),
              network: network?.name,
              target: toToken?.symbol,
            }
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button small onClick={() => clearUnfinishedSwap(swap.runId)}>
          {t("Dismiss")}
        </Button>
        <Button
          small
          primary
          onClick={() =>
            openSwapModal({
              entry: "finish_prompt",
              fromTokenId: swap.fromTokenId,
              toTokenId: swap.toTokenId,
              fromAddress: swap.fromAddress,
            })
          }
        >
          {t("Finish swap")}
        </Button>
      </div>
    </div>
  )
}

export const UnfinishedSwapPrompt: FC<{ formFromTokenId: TokenId | null }> = ({
  formFromTokenId,
}) => {
  const isMultiHopEnabled = useFeatureFlag("SWAPS_MULTI_HOP")
  const [unfinishedSwaps = NO_SWAPS] = useAppState("unfinishedSwaps")
  const held = useLatestHeldSwap(isMultiHopEnabled ? unfinishedSwaps : NO_SWAPS, formFromTokenId)

  return held ? <FinishSwapPrompt swap={held} /> : null
}
