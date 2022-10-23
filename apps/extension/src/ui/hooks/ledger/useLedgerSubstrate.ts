// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Ledger } from "@polkadot/hw-ledger"
import { assert } from "@polkadot/util"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { useSetInterval } from "../useSetInterval"
import { DEBUG } from "@core/constants"
import { getLedgerErrorProps, LedgerStatus } from "./common"
import { useLedgerSubstrateApp } from "./useLedgerSubstrateApp"

export const useLedgerSubstrate = (genesis?: string | null) => {
  const app = useLedgerSubstrateApp(genesis)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [error, setError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<Ledger | null>(null)

  const refConnecting = useRef(false)

  const connectLedger = useCallback(
    async (resetError?: boolean) => {
      if (!app) return
      if (refConnecting.current) return
      refConnecting.current = true

      setIsReady(false)
      setIsLoading(true)
      // when displaying an error and polling silently, on the UI we don't want the error to disappear
      // so error should be cleared explicitly
      if (resetError) setError(undefined)

      try {
        assert(getIsLedgerCapable(), "Sorry, Ledger is not supported on your browser.")
        assert(app?.name, "There is no Ledger app available for this network.")

        const ledger = new Ledger("webusb", app.name)

        // verify that Ledger connection is ready by querying first address
        await Promise.race([
          ledger.getAddress(false),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ])

        setLedger(ledger)
        setError(undefined)
        setIsReady(true)
      } catch (err) {
        // eslint-disable-next-line no-console
        DEBUG && console.error("connectLedger " + (err as Error).message, { err })

        setLedger(null)
        setError(err as Error)
      }

      refConnecting.current = false
      setIsLoading(false)
    },
    [app]
  )

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (error) return getLedgerErrorProps(error, app?.label)

    if (isLoading)
      return {
        status: "connecting",
        message: `Connecting to Ledger...`,
        requiresManualRetry: false,
      }

    if (isReady)
      return {
        status: "ready",
        message: "Successfully connected to Ledger.",
        requiresManualRetry: false,
      }

    return { status: "unknown", message: "", requiresManualRetry: false }
  }, [isReady, isLoading, error, app])

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
    network: app,
    ledger,
    refresh,
  }
}
