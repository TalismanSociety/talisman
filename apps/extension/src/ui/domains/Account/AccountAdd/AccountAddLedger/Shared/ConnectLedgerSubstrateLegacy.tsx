import { log } from "extension-shared"
import { FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Spacer } from "@talisman/components/Spacer"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "@ui/domains/Account/LedgerConnectionStatus"
import { getCustomTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateLegacy } from "@ui/hooks/ledger/useLedgerSubstrateLegacy"
import { useChain } from "@ui/state"

type ConnectLedgerSubstrateLegacyProps = {
  chainId: string
  onReadyChanged?: (ready: boolean) => void
  className?: string
}

export const ConnectLedgerSubstrateLegacy: FC<ConnectLedgerSubstrateLegacyProps> = ({
  chainId,
  onReadyChanged,
  className,
}) => {
  const { t } = useTranslation("admin")
  const chain = useChain(chainId)
  const { app, getAddress } = useLedgerSubstrateLegacy(chain?.genesisHash)

  // flag to prevents double connect attempt in dev mode
  const refIsBusy = useRef(false)

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Connecting to Ledger..."),
  })

  const connect = useCallback(async () => {
    if (refIsBusy.current) return
    refIsBusy.current = true

    try {
      onReadyChanged?.(false)
      setConnectionStatus({
        status: "connecting",
        message: t("Connecting to Ledger..."),
      })

      await getAddress(0, 0)

      setConnectionStatus({
        status: "ready",
        message: t("Successfully connected to Ledger."),
      })
      onReadyChanged?.(true)
    } catch (err) {
      const error = getCustomTalismanLedgerError(err)
      log.error("ConnectLedgerSubstrateGeneric", { error })
      setConnectionStatus({
        status: "error",
        message: error.message,
        onRetryClick: connect,
      })
    } finally {
      refIsBusy.current = false
    }
  }, [getAddress, onReadyChanged, t])

  useEffect(() => {
    connect()
  }, [connect, getAddress, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        {t("Connect and unlock your Ledger, then open the {{appName}} app on your Ledger.", {
          appName: app?.name ?? "UNKNOWN_APP",
        })}
      </div>
      <Spacer small />
      {!!connectionStatus && <LedgerConnectionStatus {...connectionStatus} />}
    </div>
  )
}
