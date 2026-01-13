import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"
import { getEthLedgerDerivationPath } from "extension-core"
import { type FC, useCallback } from "react"

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
      appName="Ethereum"
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
