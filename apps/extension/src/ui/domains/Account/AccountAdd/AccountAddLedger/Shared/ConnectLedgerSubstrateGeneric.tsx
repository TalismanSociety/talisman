import { LedgerPolkadotCurve } from "extension-core"
import { FC, useCallback } from "react"

import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerPolkadot } from "@ui/hooks/ledger/useLedgerPolkadot"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerSubstrateGeneric: FC<{
  onReadyChanged: (ready: boolean) => void
  className?: string
  curve: LedgerPolkadotCurve
  legacyAppName?: string | null
}> = ({ onReadyChanged, className, legacyAppName, curve }) => {
  const legacyApp = useLedgerSubstrateAppByName(legacyAppName)
  const { getAddressEd25519, getAddressEcdsa } = useLedgerPolkadot({ legacyApp })

  const isReadyCheck = useCallback(() => {
    const derivationPath = getPolkadotLedgerDerivationPath({ legacyApp })
    switch (curve) {
      case "ethereum":
        return getAddressEcdsa(derivationPath)
      case "ed25519":
        return getAddressEd25519(derivationPath)
    }
  }, [curve, getAddressEcdsa, getAddressEd25519, legacyApp])

  return (
    <ConnectLedgerBase
      appName={!legacyAppName || legacyAppName === "Polkadot" ? "Polkadot" : "Polkadot Migration"}
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
