import { Ledger } from "@polkadot/hw-ledger"
import { assert } from "@polkadot/util"
import { throwAfter } from "@talismn/util"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash } from "../useChainByGenesisHash"
import { useSetInterval } from "../useSetInterval"
import {
  ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE,
  ERROR_LEDGER_NO_APP,
  LedgerStatus,
  getLedgerErrorProps,
} from "./common"
import { useLedgerSubstrateLegacyApp } from "./useLedgerSubstrateLegacyApp"

export const useLedgerSubstrateLegacy = (genesis?: string | null, persist = false) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(genesis)
  const app = useLedgerSubstrateLegacyApp(genesis)
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [error, setError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<Ledger | null>(null)

  const refConnecting = useRef(false)

  useEffect(() => {
    return () => {
      // ensures the transport is closed on unmount, allowing other tabs to access the ledger
      // the persist argument can be used to prevent this behaviour, when the hook is used
      // in two components that need to share the ledger connection
      !persist &&
        ledger?.withApp(async (app) => {
          await app?.transport.close()
        })
    }
  }, [ledger, persist])

  const connectLedger = useCallback(
    async (resetError?: boolean) => {
      if (refConnecting.current) return
      refConnecting.current = true

      setIsReady(false)
      setIsLoading(true)
      // when displaying an error and polling silently, on the UI we don't want the error to disappear
      // so error should be cleared explicitly
      if (resetError) setError(undefined)

      try {
        assert(getIsLedgerCapable(), t("Sorry, Ledger is not supported on your browser."))
        assert(!chain || chain.account !== "secp256k1", ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE)
        assert(app?.name, ERROR_LEDGER_NO_APP)

        const ledger = new Ledger("webusb", app.name)

        // verify that Ledger connection is ready by querying first address
        await Promise.race([
          ledger.getAddress(false),
          throwAfter(5_000, "Timeout on Ledger Substrate connection"),
        ])

        setLedger(ledger)
        setError(undefined)
        setIsReady(true)
      } catch (err) {
        log.error("connectLedger Substrate " + (err as Error).message, { err })

        setLedger(null)
        setError(err as Error)
      }

      refConnecting.current = false
      setIsLoading(false)
    },
    [app, chain, t]
  )

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (error) return getLedgerErrorProps(error, app?.label ?? t("Unknown app"))

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
  }, [isReady, isLoading, error, app, t])

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
