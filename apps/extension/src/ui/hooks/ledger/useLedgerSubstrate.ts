// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useState } from "react"
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

  const ledger = useMemo(() => {
    try {
      assert(getIsLedgerCapable(), "Sorry, Ledger is not supported on your browser.")
      assert(app, "There is no Ledger app available for this network.")

      return new Ledger("webusb", app.name)
    } catch (err) {
      // eslint-disable-next-line no-console
      DEBUG && console.error("create ledger " + (err as Error).message, err)

      setError(err as Error)
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genesis, refreshCounter])

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

  const connectLedger = useCallback(
    async (resetError?: boolean) => {
      setIsReady(false)
      if (!ledger) return

      setIsLoading(true)
      // when displaying an error and polling silently, on the UI we don't want the error to disappear
      // so error should be cleared explicitly
      if (resetError) setError(undefined)

      try {
        // verify that Ledger connection is ready by querying first address
        await ledger.getAddress(false)
        setError(undefined)
        setIsReady(true)
      } catch (err) {
        // eslint-disable-next-line no-console
        DEBUG && console.error("connectLedger " + (err as Error).message, { err })

        setError(err as Error)
      }

      setIsLoading(false)
    },
    [ledger]
  )

  // automatic connection (startup + polling)
  useEffect(() => {
    connectLedger()
  }, [connectLedger])

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
