import Transport from "@ledgerhq/hw-transport"
import TransportWebHID from "@ledgerhq/hw-transport-webhid"
// import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { throwAfter } from "@talismn/util"
import { GenericApp, newGenericApp } from "@zondax/ledger-substrate"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetInterval } from "../useSetInterval"
import { LedgerError, LedgerStatus, getLedgerErrorProps } from "./common"

const NO_ERRORS = "No errors"

export const LEDGER_DEFAULT_ACCOUNT = 0x80000000
export const LEDGER_DEFAULT_CHANGE = 0x80000000
export const LEDGER_DEFAULT_INDEX = 0x80000000

export const useLedgerPolkadot = (persist = false) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [ledgerError, setLedgerError] = useState<LedgerError>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<GenericApp | null>(null)
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
      await refTransport.current?.close()

      refTransport.current = await TransportWebHID.create() // also tried TransportWebUSB.create()

      // TODO native token symbol
      const ledger = newGenericApp(refTransport.current, "DOT", "https://api.zondax.ch/polkadot")

      const version = await Promise.race([
        ledger.getVersion(),
        throwAfter(5_000, "Timeout on Ledger Polkadot connection"),
      ])
      // console.log("version", { version })

      if (version.error_message !== NO_ERRORS)
        throw new LedgerError(version.error_message, version.error_message, version.return_code)

      if (version.device_locked)
        throw new LedgerError("Ledger is locked", "Locked", version.return_code)

      // const appInfo = await ledger.appInfo()
      // console.log("appInfo", { appInfo })

      const ss58prefix = 0 // this is for polkadot
      const address = await Promise.race([
        ledger.getAddress(
          LEDGER_DEFAULT_ACCOUNT, // 0x80000000 (also tried with 0)
          LEDGER_DEFAULT_CHANGE, // 0x80000000 (also tried with 0)
          LEDGER_DEFAULT_INDEX, // 0x80000000 (also tried with 0)
          ss58prefix
        ),
        throwAfter(5_000, "Timeout on Ledger Polkadot connection"),
      ])
      // console.log("address", { address })

      if (address.error_message !== "No errors")
        throw new LedgerError(address.error_message, address.error_message, address.return_code)

      setLedgerError(undefined)
      setLedger(ledger)
      setIsReady(true)
    } catch (err) {
      log.error("connectLedger Polkadot : " + (err as LedgerError).message, { err })

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
    if (ledgerError) return getLedgerErrorProps(ledgerError, "Polkadot")

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
