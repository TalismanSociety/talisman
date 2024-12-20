import { FC, useCallback } from "react"

import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGeneric"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerSubstrateGeneric: FC<{
  onReadyChanged: (ready: boolean) => void
  className?: string
  legacyAppName?: string | null
}> = ({ onReadyChanged, className, legacyAppName }) => {
  const legacyApp = useLedgerSubstrateAppByName(legacyAppName)
  const { getAddress } = useLedgerSubstrateGeneric({ legacyApp })

  const isReadyCheck = useCallback(() => {
    const derivationPath = getPolkadotLedgerDerivationPath({ legacyApp })
    return getAddress(derivationPath)
  }, [getAddress, legacyApp])

  return (
    <ConnectLedgerBase
      appName={legacyAppName ? "Polkadot Migration" : "Polkadot"}
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
