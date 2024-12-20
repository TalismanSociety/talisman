import { getEthLedgerDerivationPath } from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"

import { Spacer } from "@talisman/components/Spacer"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "@ui/domains/Account/LedgerConnectionStatus"
import { getCustomTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerEthereum } from "@ui/hooks/ledger/useLedgerEthereum"

export const ConnectLedgerEthereum = ({
  onReadyChanged,
  className,
}: {
  onReadyChanged?: (ready: boolean) => void
  className?: string
}) => {
  const { t } = useTranslation("admin")
  const { getAddress } = useLedgerEthereum()

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

      const derivationPath = getEthLedgerDerivationPath("LedgerLive")
      await getAddress(derivationPath)

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
        <Trans t={t}>
          Connect and unlock your Ledger, then open the <span className="text-body">Ethereum</span>{" "}
          app on your Ledger.
        </Trans>
      </div>
      <Spacer small />
      <LedgerConnectionStatus {...connectionStatus} />
    </div>
  )
}
