// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { formatLedgerEthereumErrorMessage } from "@talisman/util/formatLedgerErrorMessage"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { useSetInterval } from "./useSetInterval"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import Transport from "@ledgerhq/hw-transport"
import { getEthLedgerDerivationPath } from "@core/domains/ethereum/helpers"
import { DEBUG } from "@core/constants"

// TODO reuse substrate one ?
export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

// TODO better name ?
export type LedgerDetailedError = {
  message: string
  name: string
  stack: string
  statusCode: number
  statusText: string
}

// TODO reuse substrate one ?
export type LedgerState = {
  isLedgerCapable: boolean
  isLoading: boolean
  isReady: boolean
  requiresManualRetry?: boolean
  status: LedgerStatus
  message: string
  ledger: LedgerEthereumApp | null
  refresh: () => void
  disconnect: () => void
}

export const useLedgerEthereum = (): LedgerState => {
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<string>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<LedgerEthereumApp | null>(null)

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (ledgerError) return formatLedgerEthereumErrorMessage(ledgerError)

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
  }, [ledgerError, isLoading, isReady])

  const refConnecting = useRef(false)

  const connectLedger = useCallback(async (resetError?: boolean) => {
    if (refConnecting.current) {
      return
    }
    refConnecting.current = true

    setIsLoading(true)
    setIsReady(false)

    // when displaying an error and polling silently, on the UI we don't want the error to disappear
    // so error should be cleared explicitly
    if (resetError) setLedgerError(undefined)

    let transport: Transport | null = null

    try {
      transport = await TransportWebUSB.create()

      const ledger = new LedgerEthereumApp(transport)

      // this may hang at this point just after plugging the ledger
      await Promise.race([
        ledger.getAddress(getEthLedgerDerivationPath("LedgerLive")),
        new Promise((_, reject) => setTimeout(() => reject("Timeout"), 5000)),
      ])

      setLedgerError(undefined)
      setLedger(ledger)
      setIsReady(true)
    } catch (err) {
      setLedger(null)

      const ledgerError = err as LedgerDetailedError
      // eslint-disable-next-line no-console
      DEBUG && console.error(ledgerError.message, { ledgerError })

      if (err instanceof DOMException) {
        if (err.name === "SecurityError")
          setLedgerError("Failed to connect USB. Restart your browser and retry.")
        else setLedgerError("Unknown error, cannot connect to Ledger")
        return
      }

      if (ledgerError.name === "TransportWebUSBGestureRequired") setLedgerError(ledgerError.name)
      else if (ledgerError.name === "NetworkError") setLedgerError("NetworkError")
      else if (ledgerError.name === "NotFoundError") setLedgerError("NotFoundError")
      else if (ledgerError.message === "Timeout") setLedgerError("Timeout")
      else if (ledgerError.name === "TransportInterfaceNotAvailable")
        setLedgerError(ledgerError.name)
      else if ([57346, 25873, 28160, 27906].includes(ledgerError.statusCode))
        setLedgerError("Ledger App not open")
      else if ([27010, 27404].includes(ledgerError.statusCode)) setLedgerError("Ledger locked")
      else setLedgerError((err as Error).message)

      //release transport
      // TODO : might want to release it too in other cases
      // if yes we might need a ref
      transport?.close()
    }

    refConnecting.current = false
    setIsLoading(false)
  }, [])

  useEffect(() => {
    return () => {
      // TODO release transport ?
    }
  }, [])

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

  useEffect(() => {
    connectLedger()
  }, [connectLedger, refreshCounter])

  const disconnect = useCallback(() => {
    ledger?.transport?.close()
  }, [ledger?.transport])

  return {
    isLedgerCapable: getIsLedgerCapable(),
    isLoading,
    isReady,
    requiresManualRetry,
    status,
    message,
    ledger,
    refresh,
    disconnect,
  }
}
