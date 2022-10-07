// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useState } from "react"
import { Ledger } from "@polkadot/hw-ledger"
import { assert } from "@polkadot/util"
import ledgerNetworks from "@core/util/ledgerNetworks"
import { formatLedgerErrorMessage } from "@talisman/util/formatLedgerErrorMessage"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { useSetInterval } from "./useSetInterval"
import LedgerEthereum from "@ledgerhq/hw-app-eth"
import TransportWebHID from "@ledgerhq/hw-transport-webhid"
import Transport from "@ledgerhq/hw-transport"
import { listen } from "@ledgerhq/logs"

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerEthDerivationPathType = "LedgerLive" | "Legacy" | "BIP44"
const DERIVATION_PATHS: Record<LedgerEthDerivationPathType, string> = {
  LedgerLive: "m/44'/60'/0'/0/0",
  Legacy: "m/44'/60'/0'",
  BIP44: "m/44'/60'/0'/0",
}

// export const LEDGER_LIVE_PATH = "m/44'/60'/0'/0/0"
// const MEW_PATH = "m/44'/60'/0'"
// export const BIP44_PATH = "m/44'/60'/0'/0"

// const HD_PATHS = [
//   { name: "Ledger Live", value: LEDGER_LIVE_PATH },
//   { name: "Legacy (MEW / MyCrypto)", value: MEW_PATH },
//   { name: "BIP44 Standard", value: BIP44_PATH },
// ]

export type LedgerState = {
  isLedgerCapable: boolean
  isLoading: boolean
  isReady: boolean
  requiresManualRetry?: boolean
  status: LedgerStatus
  message: string
  ledger: LedgerEthereum | null
  refresh: () => void
}

const useIsLedgerSupported = () => {
  const [isSupported, setIsSupported] = useState<boolean>()

  useEffect(() => {
    TransportWebHID.isSupported().then(setIsSupported)
  }, [])

  return isSupported
}

const useLedgerHIDTransport = () => {
  const [transport, setTransport] = useState<Transport>()
  const isSupported = useIsLedgerSupported()
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const handleDisconnect = () => {
      transport?.close()
    }

    transport?.on("disconnect", handleDisconnect)

    return () => {
      transport?.off("disconnect", handleDisconnect)
      handleDisconnect()
    }
  }, [transport])

  const connect = useCallback(async () => {
    try {
      if (transport) return
      assert(await TransportWebHID.isSupported(), "Sorry, Ledger is not supported on your browser.")
      const newTransport = await TransportWebHID.create()
      setTransport(newTransport)
    } catch (err) {
      //console.log("failed to create transport", { err })
      // eslint-disable-next-line no-console
      console.error(err)
      setError((err as Error).message)
    }
  }, [transport])

  const ledger = useMemo(() => (transport ? new LedgerEthereum(transport) : null), [transport])

  const disconnect = useCallback(() => {
    setTransport(undefined)
  }, [])

  return { ledger, transport, connect, disconnect, error }
}

export const useLedgerEthereum = (): LedgerState => {
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<string>()
  const [isReady, setIsReady] = useState(false)

  // const [ledger, setLedger] = useState<LedgerEthereum | null>(null)

  const { ledger, transport, error, connect } = useLedgerHIDTransport()

  useEffect(() => {
    setLedgerError(error)
  }, [error])

  // const connect = useCallback(async () => {
  //   setLedger(null)

  //   try {
  //     assert(await TransportWebHID.isSupported(), "Sorry, Ledger is not supported on your browser.")
  //     const transport = await TransportWebHID.create()
  //     transport.close()

  //     setLedger(new LedgerEthereum(transport))
  //   } catch (err) {
  //     // eslint-disable-next-line no-console
  //     console.error(err)
  //     setLedgerError((err as Error).message)
  //     //return null
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [refreshCounter])

  useEffect(() => {
    connect()
  }, [connect, refreshCounter])

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (ledgerError) return formatLedgerErrorMessage(ledgerError)

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
  }, [isReady, isLoading, ledgerError])

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
        await ledger.getAddress(DERIVATION_PATHS.LedgerLive)
        setLedgerError(undefined)
        setIsReady(true)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
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
    ledger,
    refresh,
  }
}
