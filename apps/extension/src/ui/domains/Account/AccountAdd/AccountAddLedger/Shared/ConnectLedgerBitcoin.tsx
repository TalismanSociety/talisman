import { useLedgerBitcoin } from "@ui/hooks/ledger/useLedgerBitcoin"
import { type FC, useCallback } from "react"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerBitcoin: FC<{
  onReadyChanged: (ready: boolean) => void
  className?: string
}> = ({ onReadyChanged, className }) => {
  const { getMasterFingerprint } = useLedgerBitcoin()

  // reading the master fingerprint confirms the Bitcoin app is open and unlocked
  const isReadyCheck = useCallback(() => getMasterFingerprint(), [getMasterFingerprint])

  return (
    <ConnectLedgerBase
      appName="Bitcoin"
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
