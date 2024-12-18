import { log } from "extension-shared"
import { FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Spacer } from "@talisman/components/Spacer"
import {
  LedgerConnectionStatus,
  LedgerConnectionStatusProps,
} from "@ui/domains/Account/LedgerConnectionStatus"
import { getPolkadotLedgerDerivationPath } from "@ui/hooks/ledger/common"
import { getCustomTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSubstrateAppByName } from "@ui/hooks/ledger/useLedgerSubstrateApp"
import { useLedgerSubstrateGeneric } from "@ui/hooks/ledger/useLedgerSubstrateGenericNew"

type ConnectLedgerSubstrateGenericProps = {
  onReadyChanged?: (ready: boolean) => void
  className?: string
  legacyAppName?: string | null
}

export const ConnectLedgerSubstrateGeneric: FC<ConnectLedgerSubstrateGenericProps> = ({
  onReadyChanged,
  className,
  legacyAppName,
}) => {
  const legacyApp = useLedgerSubstrateAppByName(legacyAppName)
  const { getAddress } = useLedgerSubstrateGeneric({ legacyApp })
  const { t } = useTranslation("admin")

  // this busy check prevents double connect attempt in dev mode
  const refIsBusy = useRef(false)

  const [connectionStatus, setConnectionStatus] = useState<LedgerConnectionStatusProps>({
    status: "connecting",
    message: t("Connecting to Ledger..."),
  })

  const connect = useCallback(async () => {
    if (refIsBusy.current) return
    refIsBusy.current = true

    try {
      onReadyChanged?.(true)
      setConnectionStatus({
        status: "connecting",
        message: t("Connecting to Ledger..."),
      })
      const bip44path = getPolkadotLedgerDerivationPath({ legacyApp })
      await getAddress(bip44path)
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
  }, [getAddress, legacyApp, onReadyChanged, t])

  useEffect(() => {
    connect()
  }, [connect, getAddress, legacyApp, onReadyChanged])

  return (
    <div className={className}>
      <div className="text-body-secondary m-0">
        {t("Connect and unlock your Ledger, then open the {{appName}} app on your Ledger.", {
          appName: legacyApp ? "Polkadot Migration" : "Polkadot",
        })}
      </div>
      <Spacer small />
      {!!connectionStatus && <LedgerConnectionStatus {...connectionStatus} />}
    </div>
  )
}
