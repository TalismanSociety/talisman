import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSetInterval } from "../useSetInterval"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import Transport from "@ledgerhq/hw-transport"
import { getEthLedgerDerivationPath } from "@core/domains/ethereum/helpers"
import { getLedgerErrorProps, LedgerStatus } from "./common"
import { DEBUG } from "@core/constants"

export const useLedgerEthereum = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<LedgerEthereumApp | null>(null)

  const refConnecting = useRef(false)

  const connectLedger = useCallback(async (resetError?: boolean) => {
    if (refConnecting.current) return
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
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
      ])

      setLedgerError(undefined)
      setLedger(ledger)
      setIsReady(true)
    } catch (err) {
      try {
        await transport?.close()
      } catch (err2) {
        // ignore
      }
      // temporarily disabled debug check for this, to troubleshot on other people's computers
      // TODO before merge, add DEBUG &&
      // eslint-disable-next-line no-console
      console.error("connectLedger Ethereum : " + (err as Error).message, { err })
      setLedger(null)
      setLedgerError(err as Error)
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
