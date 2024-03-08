import { getEthLedgerDerivationPath } from "@extension/core"
import { log } from "@extension/shared"
import { LEDGER_ETHEREUM_MIN_VERSION } from "@extension/shared"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { throwAfter } from "@talismn/util"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { gte } from "semver"

import { useSetInterval } from "../useSetInterval"
import { LedgerError, LedgerStatus, getLedgerErrorProps } from "./common"

export const useLedgerEthereum = (persist = false) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<LedgerError>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<LedgerEthereumApp | null>(null)
  const refConnecting = useRef(false)
  const refTransport = useRef<Transport | null>(null)

  useEffect(() => {
    return () => {
      // ensures the transport is closed on unmount, allowing other tabs to access the ledger
      // the persist argument can be used to prevent this behaviour, when the hook is used
      // in two components that need to share the ledger connection
      if (!persist && ledger?.transport) {
        ledger.transport.close()
      }
    }
  }, [ledger?.transport, persist])

  const connectLedger = useCallback(async (resetError?: boolean) => {
    if (refConnecting.current) return
    refConnecting.current = true

    setIsLoading(true)
    setIsReady(false)

    // when displaying an error and polling silently, on the UI we don't want the error to disappear
    // so error should be cleared explicitly
    if (resetError) setLedgerError(undefined)

    try {
      refTransport.current = await TransportWebUSB.create()

      const ledger = new LedgerEthereumApp(refTransport.current)
      // this may hang at this point just after plugging the ledger
      await Promise.race([
        ledger.getAddress(getEthLedgerDerivationPath("LedgerLive")),
        throwAfter(5_000, "Timeout on Ledger Ethereum connection"),
      ])

      const { version } = await ledger.getAppConfiguration()
      if (!gte(version, LEDGER_ETHEREUM_MIN_VERSION))
        throw new LedgerError("Unsupported version", "UnsupportedVersion")

      setLedgerError(undefined)
      setLedger(ledger)
      setIsReady(true)
    } catch (err) {
      log.error("connectLedger Ethereum : " + (err as LedgerError).message, { err })

      try {
        await refTransport.current?.close()
        refTransport.current = null
      } catch (err2) {
        log.error("Can't close ledger transport", err2)
        // ignore
      }
      setLedger(null)
      setLedgerError(err as LedgerError)
    }

    refConnecting.current = false
    setIsLoading(false)
  }, [])

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (ledgerError) return getLedgerErrorProps(ledgerError, "Ethereum")

    if (isLoading)
      return {
        status: "connecting",
        message: t(`Connecting to Ledger...`),
        requiresManualRetry: false,
      }

    if (isReady)
      return {
        status: "ready",
        message: t("Successfully connected to Ledger."),
        requiresManualRetry: false,
      }

    return { status: "unknown", message: "", requiresManualRetry: false }
  }, [ledgerError, isLoading, isReady, t])

  // if not connected, poll every 2 seconds
  // this will recreate the ledger instance which triggers automatic connection
  useSetInterval(() => {
    if (
      !isLoading &&
      !requiresManualRetry &&
      ["warning", "error", "unknown", "connecting"].includes(status)
    )
      setRefreshCounter((idx) => idx + 1)
  }, 2000)

  // manual connection
  const refresh = useCallback(() => {
    connectLedger(true)
  }, [connectLedger])

  useEffect(() => {
    connectLedger()
  }, [connectLedger, refreshCounter])

  return {
    isLoading,
    isReady,
    requiresManualRetry,
    status,
    message,
    ledger,
    refresh,
  }
}
