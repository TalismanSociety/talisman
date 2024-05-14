import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { throwAfter } from "@talismn/util"
import { PolkadotGenericApp, newPolkadotGenericApp } from "@zondax/ledger-substrate"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetInterval } from "../useSetInterval"
import { LedgerError, LedgerStatus, getLedgerErrorProps } from "./common"

export const useLedgerSubstrateGeneric = (persist = false) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [error, setError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<PolkadotGenericApp | null>(null)

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
  }, [ledger, persist])

  const connectLedger = useCallback(async (resetError?: boolean) => {
    if (refConnecting.current) return
    refConnecting.current = true

    setIsReady(false)
    setIsLoading(true)
    // when displaying an error and polling silently, on the UI we don't want the error to disappear
    // so error should be cleared explicitly
    if (resetError) setError(undefined)

    try {
      await refTransport.current?.close()
      refTransport.current = await TransportWebUSB.create()

      const ledger = newPolkadotGenericApp(refTransport.current, "hello", "web3")

      // verify that Ledger connection is ready by querying first address
      const response = await Promise.race([
        ledger.getAddress(0, 0, 0, 42, false),
        throwAfter(5_000, "Timeout on Ledger Substrate Generic connection"),
      ])

      if (response.error_message !== "No errors")
        throw new LedgerError(response.error_message, "LedgerError", response.return_code)

      setLedger(ledger)
      setError(undefined)
      setIsReady(true)
    } catch (err) {
      log.error("connectLedger Substrate Generic : " + (err as LedgerError).message, { err })

      try {
        await refTransport.current?.close()
        refTransport.current = null
      } catch (err2) {
        log.error("Can't close ledger transport", err2)
        // ignore
      }

      setLedger(null)
      setError(err as Error)
    }

    refConnecting.current = false
    setIsLoading(false)
  }, [])

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (error) return getLedgerErrorProps(error, "Polkadot Generic")

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
  }, [isReady, isLoading, error, t])

  // automatic connection (startup + polling)
  useEffect(() => {
    connectLedger()
  }, [connectLedger, refreshCounter])

  // if not connected, poll every 2 seconds
  // this will recreate the ledger instance which triggers automatic connection
  useSetInterval(() => {
    if (!isLoading && !requiresManualRetry && ["warning", "error", "unknown"].includes(status))
      setRefreshCounter((idx) => idx + 1)
  }, 2000)

  // manual connection
  const refresh = useCallback(() => {
    connectLedger(true)
  }, [connectLedger])

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
