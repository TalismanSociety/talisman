import type { Account } from "@core/domains/keyring/exports"
import { isAccountOfType } from "@core/domains/keyring/exports"
import type { ScaleApiSubmitMode } from "@talismn/sapi"
import { track } from "@ui/api/track"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { useCallback, useMemo, useState } from "react"

export function useMevShield({
  netuid,
  account,
  direction,
}: {
  netuid: number
  account: Account | null
  direction: "buy" | "sell"
}) {
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

  return {
    setIsMevProtectionEnabled: toggleMevProtection,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled: !isMevShieldFeatureEnabled,
    withMevShield,
    txMode,
  }
}
