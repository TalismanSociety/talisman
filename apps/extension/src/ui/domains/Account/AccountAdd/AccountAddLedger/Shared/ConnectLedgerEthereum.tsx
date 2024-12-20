import { getEthLedgerDerivationPath } from "extension-core"
import { FC, useCallback } from "react"

import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerEthereum: FC<{
  onReadyChanged: (ready: boolean) => void
  className?: string
}> = ({ onReadyChanged, className }) => {
  const { getAddress } = useLedgerEthereum()

  const isReadyCheck = useCallback(() => {
    const derivationPath = getEthLedgerDerivationPath("LedgerLive")
    return getAddress(derivationPath)
  }, [getAddress])

  return (
    <ConnectLedgerBase
      isReadyCheck={isReadyCheck}
      appName="Ethereum"
      onReadyChanged={onReadyChanged}
      className={className}
    />
  )
}
