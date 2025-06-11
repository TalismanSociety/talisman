import { log } from "extension-shared"
import { FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Spacer } from "@talisman/components/Spacer"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "@ui/domains/Account/LedgerConnectionStatus"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"

type ConnectLedgerBaseProps = {
  appName: string
  isReadyCheck: () => Promise<unknown>
  onReadyChanged: (ready: boolean) => void
  className?: string
}

export const ConnectLedgerBase: FC<ConnectLedgerBaseProps> = ({
  appName,
  isReadyCheck,
  onReadyChanged,
  className,
}) => {
  const { t } = useTranslation()

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

      await isReadyCheck()

      setConnectionStatus({
        status: "ready",
        message: t("Successfully connected to Ledger."),
      })
      onReadyChanged?.(true)
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("ConnectLedgerSubstrateGeneric", { error })
      setConnectionStatus({
        status: "error",
        message: error.message,
        onRetryClick: connect,
      })
    } finally {
      refIsBusy.current = false
    }
  }, [isReadyCheck, onReadyChanged, t])

  useEffect(() => {
    connect()
  }, [connect, isReadyCheck, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        {t("Connect and unlock your Ledger, then open the {{appName}} app on your Ledger.", {
          appName,
        })}
      </div>
      <Spacer small />
      {!!connectionStatus && <LedgerConnectionStatus {...connectionStatus} />}
    </div>
  )
}
