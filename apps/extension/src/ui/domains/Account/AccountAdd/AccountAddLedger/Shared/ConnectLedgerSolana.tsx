import { getSolLedgerDerivationPath } from "@core/domains/solana/exports"
import { useLedgerSolana } from "@ui/hooks/ledger/useLedgerSolana"
import { type FC, useCallback } from "react"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerSolana: FC<{
  onReadyChanged: (ready: boolean) => void
  className?: string
}> = ({ onReadyChanged, className }) => {
  const { getAddress } = useLedgerSolana()

  const isReadyCheck = useCallback(() => {
    return getAddress(getSolLedgerDerivationPath("ledger-live"))
  }, [getAddress])

  return (
    <ConnectLedgerBase
      appName="Solana"
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
