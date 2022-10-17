// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useState } from "react"
import { Ledger } from "@polkadot/hw-ledger"
import { assert } from "@polkadot/util"
import ledgerNetworks from "@core/util/ledgerNetworks"
import { formatLedgerErrorMessage } from "@talisman/util/formatLedgerErrorMessage"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { useSetInterval } from "./useSetInterval"
import { DEBUG } from "@core/constants"

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerState = {
  isLedgerCapable: boolean
  isLoading: boolean
  isReady: boolean
  requiresManualRetry?: boolean
  status: LedgerStatus
  message: string
  ledger: Ledger | null
  network: string | null
  refresh: () => void
}

export const useLedgerSubstrate = (genesis?: string | null): LedgerState => {
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<string>()
  const [isReady, setIsReady] = useState(false)

  const { network } = useMemo(
    () =>
      genesis
        ? ledgerNetworks.find(({ genesisHash: [hash] }) => hash === genesis) ?? {
            network: "unknown network",
          }
        : { network: null },
    [genesis]
  )

  const ledger = useMemo(() => {
    if (!network) return null

    try {
      assert(getIsLedgerCapable(), "Sorry, Ledger is not supported on your browser.")
      assert(network !== "unknown network", "There is no Ledger app available for this network.")

      return new Ledger("webusb", network)
    } catch (err) {
      // eslint-disable-next-line no-console
      DEBUG && console.error("ledger " + (err as Error).message, err)

      if (err instanceof DOMException) {
        if (err.name === "SecurityError")
          setLedgerError("Failed to connect USB. Restart your browser and retry.")
        else setLedgerError("Unknown error, cannot connect to Ledger")
        return null
      }

      setLedgerError((err as Error).message)
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genesis, refreshCounter])

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (ledgerError) return formatLedgerErrorMessage(ledgerError, network ?? undefined)

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
  }, [isReady, isLoading, ledgerError, network])

  const connectLedger = useCallback(
    async (resetError?: boolean) => {
      setIsReady(false)
      if (!ledger) return

      setIsLoading(true)
      // when displaying an error and polling silently, on the UI we don't want the error to disappear
      // so error should be cleared explicitly
      if (resetError) setLedgerError(undefined)

      try {
        // verify that Ledger connection is ready by querying first address
        await ledger.getAddress(false)
        setLedgerError(undefined)
        setIsReady(true)
      } catch (err) {
        // eslint-disable-next-line no-console
        DEBUG && console.error("connectLedger " + (err as Error).message, { err })

        if (err instanceof DOMException) {
          if (err.name === "SecurityError")
            setLedgerError("Failed to connect USB. Restart your browser and retry.")
          else setLedgerError("Unknown error, cannot connect to Ledger")
          return
        }

        setLedgerError((err as Error).message)
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
    isLedgerCapable: getIsLedgerCapable(),
    isLoading,
    isReady,
    requiresManualRetry,
    status,
    message,
    network,
    ledger,
    refresh,
  }
}
