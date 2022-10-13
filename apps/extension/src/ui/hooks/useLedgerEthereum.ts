// Adapted from @polkadot/extension-ui
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { assert } from "@polkadot/util"
import { formatLedgerEthereumErrorMessage } from "@talisman/util/formatLedgerErrorMessage"
import { getIsLedgerCapable } from "@core/util/getIsLedgerCapable"
import { useSetInterval } from "./useSetInterval"
import LedgerEthereumApp from "@ledgerhq/hw-app-eth"
import TransportWebHID from "@ledgerhq/hw-transport-webhid"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import Transport from "@ledgerhq/hw-transport"

export type LedgerStatus = "ready" | "warning" | "error" | "connecting" | "unknown"

export type LedgerEthDerivationPathType = "LedgerLive" | "Legacy" | "BIP44"
const DERIVATION_PATHS: Record<LedgerEthDerivationPathType, string> = {
  LedgerLive: "m/44'/60'/0'/0/0",
  Legacy: "m/44'/60'/0'",
  BIP44: "m/44'/60'/0'/0",
}

export type LedgerDetailedError = {
  message: string
  name: string
  stack: string
  statusCode: number
  statusText: string
}

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

// const useIsLedgerSupported = () => {
//   const [isSupported, setIsSupported] = useState<boolean>()

//   useEffect(() => {
//     TransportWebHID.isSupported().then(setIsSupported)
//   }, [])

//   return isSupported
// }

// const useLedgerUSBTransport = () => {
//   const [transport, setTransport] = useState<Transport>()
//   // const isSupported = useIsLedgerSupported()
//   // const [isConnected, setIsConnected] = useState(false)
//   const [error, setError] = useState<string>()

//   // ensure there is only 1 connection attempt or subsequent ones will throw errors
//   const refConnecting = useRef(false)
//   //const refTransport = useRef<Transport>();

//   // const disconnect = useCallback(() => {
//   //   setTransport((t) => {
//   //     console.log("disconnecting", { t })
//   //     return undefined // clear state
//   //   })
//   // }, [])

//   // useEffect(() => {
//   //   return () => {
//   //     console.log("unmount - transport?.close()")
//   //     transport?.close()
//   //   }
//   // }, [])

//   useEffect(() => {
//     const handleDisconnect = () => {
//       setTransport(undefined)
//     }

//     // console.log("transport connected", { transport })
//     transport?.on("disconnect", handleDisconnect)

//     return () => {
//       transport?.off("disconnect", handleDisconnect)
//     }
//   }, [transport])

//   const connect = useCallback(async () => {
//     if (transport || refConnecting.current) return
//     refConnecting.current = true

//     try {
//       assert(await TransportWebUSB.isSupported(), "Sorry, Ledger is not supported on your browser.")

//       const newTransport = await TransportWebUSB.create()
//       setTransport(newTransport)
//     } catch (err) {
//       const ledgerError = err as LedgerDetailedError
//       //console.log("failed to create transport", { err })
//       // eslint-disable-next-line no-console
//       console.error(ledgerError.message, ledgerError)
//       //console.log("connect", { err })
//       if (ledgerError.statusCode === 25873) setError("Ledger App not opened 25873")
//       else if (ledgerError.statusCode === 27906) setError("Ledger App not opened 27906")
//       else if (ledgerError.statusCode === 27404) setError("Ledger App not opened 27404")
//       else setError((err as Error).message)
//     }

//     refConnecting.current = false
//   }, [transport])

//   const ledger = useMemo(() => (transport ? new LedgerEthereumApp(transport) : null), [transport])

//   return { ledger, transport, connect, error }
// }

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
        ledger.getAddress(DERIVATION_PATHS.LedgerLive),
        new Promise((_, reject) => setTimeout(() => reject("Timeout"), 5000)),
      ])

      setLedgerError(undefined)
      setLedger(ledger)
      setIsReady(true)
    } catch (err) {
      setLedger(null)
      const ledgerError = err as LedgerDetailedError
      // eslint-disable-next-line no-console
      console.error(ledgerError.message, ledgerError)
      if (ledgerError.name === "TransportWebUSBGestureRequired") setLedgerError(ledgerError.name)
      else if (ledgerError.name === "NetworkError") setLedgerError("NetworkError")
      else if (ledgerError.name === "NotFoundError") setLedgerError("NotFoundError")
      else if (ledgerError.message === "Timeout") setLedgerError("Timeout")
      else if (ledgerError.name === "TransportInterfaceNotAvailable")
        setLedgerError(ledgerError.name)
      else if (ledgerError.statusCode === 57346) setLedgerError("Ledger App not open 57346")
      else if (ledgerError.statusCode === 25873) setLedgerError("Ledger App not open 25873")
      else if (ledgerError.statusCode === 27010) setLedgerError("Ledger locked 27010")
      else if (ledgerError.statusCode === 27906) setLedgerError("Ledger App not open 27906")
      else if (ledgerError.statusCode === 27404) setLedgerError("Ledger locked 27404")
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
