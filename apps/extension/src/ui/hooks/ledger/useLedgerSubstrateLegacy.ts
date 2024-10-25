import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { assert } from "@polkadot/util"
import { throwAfter } from "@talismn/util"
import { SubstrateApp } from "@zondax/ledger-substrate"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

import { useSetInterval } from "../useSetInterval"
import {
  ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE,
  ERROR_LEDGER_NO_APP,
  getLedgerErrorProps,
  LEDGER_HARDENED_OFFSET,
  LedgerError,
  LedgerStatus,
} from "./common"
import { useLedgerSubstrateAppByChain } from "./useLedgerSubstrateApp"

const LEDGER_IN_PROGRESS_ERROR = "An operation that changes interface state is in progress."

const safelyCreateTransport = async (attempt = 1): Promise<Transport> => {
  if (attempt > 5) throw new Error("Unable to connect to Ledger")
  try {
    return await TransportWebUSB.create()
  } catch (e) {
    if ((e as Error).message.includes(LEDGER_IN_PROGRESS_ERROR)) {
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      return await safelyCreateTransport(attempt + 1)
    } else throw e
  }
}

const safelyCloseTransport = async (transport: Transport | null, attempt = 1): Promise<void> => {
  if (attempt > 5) throw new Error("Unable to disconnect Ledger")
  try {
    await transport?.close()
  } catch (e) {
    if ((e as Error).message.includes(LEDGER_IN_PROGRESS_ERROR)) {
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
      return await safelyCloseTransport(transport, attempt + 1)
    } else throw e
  }
}

const safelyGetAddress = async (
  ledger: SubstrateApp,
  accountIndex: number,
  addressIndex: number,
  attempt = 1,
): Promise<{ address: string }> => {
  if (!ledger) throw new Error("Ledger not connected")

  if (attempt > 5) throw new Error("Unable to connect to Ledger")
  try {
    const change = 0
    const addressOffset = 0

    const { address, error_message, return_code } = await ledger.getAddress(
      LEDGER_HARDENED_OFFSET + accountIndex,
      LEDGER_HARDENED_OFFSET + change,
      LEDGER_HARDENED_OFFSET + addressOffset,
      false,
    )
    if (!address) throw new LedgerError(error_message, "GetAddressError", return_code)
    return { address }
  } catch (err) {
    if (
      (err as Error).message.includes(LEDGER_IN_PROGRESS_ERROR) ||
      (err as Error).message === "Unknown transport error"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      return await safelyGetAddress(ledger, accountIndex, addressIndex, attempt + 1)
    } else throw err
  }
}

export const useLedgerSubstrateLegacy = (genesis?: string | null, persist = false) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(genesis)
  const app = useLedgerSubstrateAppByChain(chain)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<SubstrateApp | null>(null)

  const refConnecting = useRef(false)
  const refTransport = useRef<Transport | null>(null)

  useEffect(() => {
    return () => {
      // ensures the transport is closed on unmount, allowing other tabs to access the ledger
      // the persist argument can be used to prevent this behaviour, when the hook is used
      // in two components that need to share the ledger connection
      if (!persist && ledger?.transport) {
        safelyCloseTransport(ledger.transport as Transport).then(() => {
          refTransport.current = null
          setLedger(null)
        })
      }
    }
  }, [ledger, persist])

  const getAddress = useCallback(
    async (accountIndex = 0, addressIndex = 0) => {
      if (!ledger) return

      return await Promise.race([
        safelyGetAddress(ledger, accountIndex, addressIndex),
        throwAfter(5_000, "Timeout on Ledger Substrate Legacy getAddress"),
      ])
    },
    [ledger],
  )

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
        assert(app?.cla, ERROR_LEDGER_NO_APP)

        refTransport.current = await safelyCreateTransport()

        const ledger = new SubstrateApp(refTransport.current, app.cla, app.slip0044)

        // verify that Ledger connection is ready by querying first address
        await Promise.race([
          safelyGetAddress(ledger, 0, 0),
          throwAfter(5_000, "Timeout on Ledger Substrate connection"),
        ])

        setLedger(ledger)
        setError(undefined)
        setIsReady(true)
      } catch (err) {
        log.error("connectLedger Substrate Legacy " + (err as Error).message, { err })

        try {
          if (
            refTransport.current &&
            "device" in refTransport.current &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (refTransport.current.device as any).opened // TODO look into this
          )
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
    },
    [app, chain, t],
  )

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (error) return getLedgerErrorProps(error, app?.name ?? t("Unknown app"))

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
  // use a ref to avoid re-renders when refreshCounter changes
  const refreshCounterRef = useRef(0)

  // automatic connection (startup + polling)
  useEffect(() => {
    connectLedger()
  }, [connectLedger])

  // if not connected, poll every 2 seconds
  // this will recreate the ledger instance which triggers automatic connection
  useSetInterval(() => {
    if (!isLoading && !requiresManualRetry && ["warning", "error", "unknown"].includes(status)) {
      refreshCounterRef.current += 1
      connectLedger()
    }
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
    getAddress,
  }
}
