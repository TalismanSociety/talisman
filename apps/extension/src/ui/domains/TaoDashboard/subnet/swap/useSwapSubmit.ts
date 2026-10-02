import { log } from "@common/log"
import type { Account } from "@core/domains/keyring/exports"
import { isAccountOfType } from "@core/domains/keyring/exports"
import { BalanceFormatter } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { track } from "@ui/api/track"
import { useBittensorSubnetSlippage } from "@ui/domains/Staking/Bittensor/hooks/useBittensorSubnetSlippage"
import {
  stakingSubmittedReport,
  stakingTransactionId,
} from "@ui/domains/Staking/shared/stakingAnalytics"
import { flows, useFlow } from "@ui/hooks/analytics/flows"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { useTokenRates } from "@ui/state/tokenRates"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetworkId } from "../../shared/TaoDashboardNetworkProvider"
import { useSwapTxWatcher } from "./SwapTxWatcher"

/**
 * Shared hook for MEV shield state and transaction submission logic
 * used by both SwapBuyProvider and SwapSellProvider.
 */
export function useSwapSubmit({
  netuid,
  account,
  direction,
  resetValueIn,
  valueIn,
  symbol,
  taoPlancks,
}: {
  netuid: number
  account: Account | null
  direction: "buy" | "sell"
  resetValueIn: () => void
  /** the amount typed: the first one starts a tao_trade attempt */
  valueIn: bigint | null
  /** symbol of the token the amount is typed in */
  symbol: string | undefined
  /** the TAO side of the trade, which prices it */
  taoPlancks: bigint | null
}) {
  const { t } = useTranslation()
  const { addTransaction } = useSwapTxWatcher()
  const [isMevProtectionEnabled, setIsMevProtectionEnabled] = useState(false)
  const isMevShieldFeatureEnabled = useFeatureFlag("BITTENSOR_MEV_SHIELD")

  const isMevShieldDisabled = useMemo(
    // supported only for hot wallets on non-root subnets
    // also disabled when feature flag is off
    () => !isMevShieldFeatureEnabled || !netuid || !isAccountOfType(account, "keypair"),
    [isMevShieldFeatureEnabled, netuid, account]
  )

  const withMevShield = useMemo(
    () => !isMevShieldDisabled && isMevProtectionEnabled,
    [isMevShieldDisabled, isMevProtectionEnabled]
  )

  const txMode = useMemo(
    (): ScaleApiSubmitMode => (withMevShield ? "bittensor-mev-shield" : "default"),
    [withMevShield]
  )

  const networkId = useTaoDashboardNetworkId()
  const network = useNetworkById(networkId)
  const taoTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const taoToken = useToken(taoTokenId, "substrate-native")
  const taoRates = useTokenRates(taoTokenId)
  const [slippageTolerance, , isDefaultSlippage] = useBittensorSubnetSlippage(netuid)

  const toggleMevProtection = useCallback(
    (enabled: boolean) => {
      track("staking_mev_shield_toggled", {
        enabled,
        direction: direction === "buy" ? "stake" : "unstake",
      })
      setIsMevProtectionEnabled(enabled)
    },
    [direction]
  )

  const confirm = useOpenClose()
  const [tradingNetuid, setTradingNetuid] = useState<number | null>(null)
  useEffect(() => {
    if (valueIn) setTradingNetuid(netuid)
  }, [valueIn, netuid])

  useFlow(flows.tao_trade, {
    active: !!valueIn || tradingNetuid === netuid,
    attributes: { direction, netuid },
    step: confirm.isOpen ? "confirm" : "amount",
  })

  const onSubmit = useCallback(
    (hash: `0x${string}`, innerHash?: `0x${string}`) => {
      log.debug("Transaction submitted", { hash })

      const report = stakingSubmittedReport({
        account,
        network,
        symbol,
        usd:
          taoPlancks === null
            ? null
            : new BalanceFormatter(taoPlancks, taoToken?.decimals, taoRates).fiat("usd"),
        slippage: { percent: slippageTolerance, isDefault: isDefaultSlippage },
      })
      if (report)
        flows.tao_trade.submitted({
          ...report,
          mev_shield: withMevShield,
          transactionId: stakingTransactionId(hash, innerHash),
        })
      setTradingNetuid(null)

      const label =
        direction === "buy" ? t("Buy SN{{netuid}}", { netuid }) : t("Sell SN{{netuid}}", { netuid })

      if (innerHash) {
        addTransaction({ label: t("MEV Shield"), hash })
        addTransaction({ label, hash: innerHash })
      } else {
        addTransaction({ label, hash })
      }

      resetValueIn()
    },
    [
      addTransaction,
      direction,
      netuid,
      resetValueIn,
      t,
      account,
      network,
      symbol,
      taoPlancks,
      taoToken?.decimals,
      taoRates,
      slippageTolerance,
      isDefaultSlippage,
      withMevShield,
    ]
  )

  return {
    isMevProtectionEnabled,
    setIsMevProtectionEnabled: toggleMevProtection,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled: !isMevShieldFeatureEnabled,
    withMevShield,
    txMode,
    onSubmit,
    confirm,
  }
}
