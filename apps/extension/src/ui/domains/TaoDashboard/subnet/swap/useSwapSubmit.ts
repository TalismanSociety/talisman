import type { ScaleApiSubmitMode } from "@talismn/sapi"
import type { Account } from "extension-core"
import { isAccountOfType } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
}: {
  netuid: number
  account: Account | null
  direction: "buy" | "sell"
  resetValueIn: () => void
}) {
  const { t } = useTranslation()
  const { addTransaction } = useSwapTxWatcher()
  const [isMevProtectionEnabled, setIsMevProtectionEnabled] = useState(false)

  const isMevShieldDisabled = useMemo(
    // supported only for hot wallets on non-root subnets
    () => !netuid || !isAccountOfType(account, "keypair"),
    [netuid, account]
  )

  const withMevShield = useMemo(
    () => !isMevShieldDisabled && isMevProtectionEnabled,
    [isMevShieldDisabled, isMevProtectionEnabled]
  )

  const txMode = useMemo(
    (): ScaleApiSubmitMode => (withMevShield ? "bittensor-mev-shield" : "default"),
    [withMevShield]
  )

  const onSubmit = useCallback(
    (hash: `0x${string}`, innerHash?: `0x${string}`) => {
      log.debug("Transaction submitted", { hash })

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
    [addTransaction, direction, netuid, resetValueIn, t]
  )

  return {
    isMevProtectionEnabled,
    setIsMevProtectionEnabled,
    isMevShieldDisabled,
    withMevShield,
    txMode,
    onSubmit,
  }
}
