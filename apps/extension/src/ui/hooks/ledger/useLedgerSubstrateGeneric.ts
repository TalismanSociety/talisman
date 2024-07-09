import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
import { throwAfter } from "@talismn/util"
import { PolkadotGenericApp } from "@zondax/ledger-substrate"
import { GenericeResponseAddress } from "@zondax/ledger-substrate/dist/common"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useSetInterval } from "../useSetInterval"
import {
  LedgerError,
  LedgerStatus,
  getLedgerErrorProps,
  getPolkadotLedgerDerivationPath,
} from "./common"
import { SubstrateMigrationApp } from "./useLedgerSubstrateMigrationApps"

type UseLedgerSubstrateGenericProps = {
  persist?: boolean
  app?: SubstrateMigrationApp | null
}

const DEFAULT_PROPS: UseLedgerSubstrateGenericProps = {}

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
  ledger: PolkadotGenericApp,
  bip44path: string,
  ss58prefix = 42,
  attempt = 1
): Promise<GenericeResponseAddress> => {
  if (!ledger) throw new Error("Ledger not connected")

  if (attempt > 5) throw new Error("Unable to connect to Ledger")
  try {
    return await ledger.getAddress(bip44path, ss58prefix, false)
  } catch (err) {
    if (
      (err as Error).message.includes(LEDGER_IN_PROGRESS_ERROR) ||
      (err as Error).message === "Unknown transport error"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
      return await safelyGetAddress(ledger, bip44path, undefined, attempt + 1)
    } else throw err
  }
}

export const useLedgerSubstrateGeneric = ({ persist, app } = DEFAULT_PROPS) => {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [isReady, setIsReady] = useState(false)
  const [ledger, setLedger] = useState<PolkadotGenericApp | null>(null)

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
    async (bip44path: string, ss58prefix = 42) => {
      if (!ledger) return

      return await Promise.race([
        safelyGetAddress(ledger, bip44path, ss58prefix),
        throwAfter(5_000, "Timeout on Ledger Substrate Generic getAddress"),
      ])
    },
    [ledger]
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
        refTransport.current = await safelyCreateTransport()

        const ledger = new PolkadotGenericApp(refTransport.current)

        const bip44path = getPolkadotLedgerDerivationPath({ app })

        // verify that Ledger connection is ready by querying first address
        await Promise.race([
          safelyGetAddress(ledger, bip44path),
          throwAfter(5_000, "Timeout on Ledger Substrate Generic connection"),
        ])

        setLedger(ledger)
        setError(undefined)
        setIsReady(true)
      } catch (err) {
        log.error("connectLedger Substrate Generic : " + (err as LedgerError).message, { err })

        try {
          if (
            refTransport.current &&
            "device" in refTransport.current &&
            (refTransport.current.device as USBDevice).opened
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
    [app]
  )

  const { status, message, requiresManualRetry } = useMemo<{
    status: LedgerStatus
    message: string
    requiresManualRetry: boolean
  }>(() => {
    if (error) return getLedgerErrorProps(error, app ? "Polkadot Migration" : "Polkadot")

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
    ledger,
    getAddress,
    refresh,
  }
}
