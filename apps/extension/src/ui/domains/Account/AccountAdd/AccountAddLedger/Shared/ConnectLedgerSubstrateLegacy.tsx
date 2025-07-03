import { FC, useCallback } from "react"

import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useNetworkById } from "@ui/state"

import { ConnectLedgerBase } from "./ConnectLedgerBase"

export const ConnectLedgerSubstrateLegacy: FC<{
  chainId: string
  onReadyChanged: (ready: boolean) => void
  className?: string
}> = ({ chainId, onReadyChanged, className }) => {
  const chain = useNetworkById(chainId, "polkadot")
  const { app, getAddress } = useLedgerSubstrateLegacy(chain?.genesisHash)

  const isReadyCheck = useCallback(() => getAddress(0, 0), [getAddress])

  return (
    <ConnectLedgerBase
      appName={app?.name ?? "Unknown App"}
      className={className}
      isReadyCheck={isReadyCheck}
      onReadyChanged={onReadyChanged}
    />
  )
}
