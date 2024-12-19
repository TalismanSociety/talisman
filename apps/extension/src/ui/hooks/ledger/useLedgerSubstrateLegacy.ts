import { TypeRegistry } from "@polkadot/types"
import { assert, u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { SubstrateApp } from "@zondax/ledger-substrate"
import {
  AccountJsonHardwareSubstrate,
  isJsonPayload,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "extension-core"
import { t } from "i18next"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash } from "@ui/state"
import { getIsLedgerCapable } from "@ui/util/getIsLedgerCapable"

import {
  ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE,
  ERROR_LEDGER_NO_APP,
  LEDGER_HARDENED_OFFSET,
  LEDGER_SUCCESS_CODE,
  LedgerError,
} from "./common"
import { getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerSubstrateAppByChain } from "./useLedgerSubstrateApp"
import { useLedgerTransport } from "./useLedgerTransport"

// const LEDGER_IN_PROGRESS_ERROR = "An operation that changes interface state is in progress."

// TODO do we need this now that transport is safe and that we have an isBusy flag ?
const getAccountAddress = async (
  ledger: SubstrateApp,
  accountIndex: number,
  addressIndex: number,
): Promise<{ address: string }> => {
  const change = 0

  const { address, error_message, return_code } = await ledger.getAddress(
    LEDGER_HARDENED_OFFSET + accountIndex,
    LEDGER_HARDENED_OFFSET + change,
    LEDGER_HARDENED_OFFSET + addressIndex,
    false,
  )

  if (!address)
    throw new LedgerError(
      error_message || "Ledger provided an empty address",
      "GetAddressError",
      return_code,
    )

  return { address }
}

const signJsonPayload = async (
  ledger: SubstrateApp,
  payload: SignerPayloadJSON,
  account: AccountJsonHardwareSubstrate,
  registry: TypeRegistry,
) => {
  // Legacy dapps don't support the CheckMetadataHash signed extension
  if (payload.signedExtensions.includes("CheckMetadataHash"))
    throw new TalismanLedgerError(
      "GenericAppRequired",
      "This network requires the Polkadot Generic app",
    ) // TODO this error message is handled in the rendering component because of a link to docs

  const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
    version: payload.version,
  })

  const unsigned = extrinsicPayload.toU8a(true)

  const {
    signature: signatureBuffer,
    error_message,
    return_code,
  } = await ledger.sign(
    LEDGER_HARDENED_OFFSET + (account.accountIndex ?? 0),
    LEDGER_HARDENED_OFFSET + 0,
    LEDGER_HARDENED_OFFSET + (account.addressOffset ?? 0),
    Buffer.from(unsigned),
  )

  if (return_code !== LEDGER_SUCCESS_CODE)
    throw new LedgerError(error_message, "SignError", return_code)

  return u8aToHex(new Uint8Array(signatureBuffer))
}

const signRawPayload = async (
  ledger: SubstrateApp,
  payload: SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
) => {
  const unsigned = u8aWrapBytes(payload.data)
  if (unsigned.length > 256) throw new Error(t("The message is too long to be signed with Ledger."))

  const {
    signature: signatureBuffer,
    error_message,
    return_code,
  } = await ledger.signRaw(
    LEDGER_HARDENED_OFFSET + (account.accountIndex ?? 0),
    LEDGER_HARDENED_OFFSET + 0,
    LEDGER_HARDENED_OFFSET + (account.addressOffset ?? 0),
    Buffer.from(unsigned),
  )

  if (return_code !== LEDGER_SUCCESS_CODE)
    throw new LedgerError(error_message, "SignError", return_code)

  // skip first byte (sig type) or signatureVerify fails, this seems specific to ed25519 signatures
  return u8aToHex(new Uint8Array(signatureBuffer.slice(1)))
}

export const useLedgerSubstrateLegacy = (genesis?: string | null) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(genesis)
  const app = useLedgerSubstrateAppByChain(chain)
  // const [isLoading, setIsLoading] = useState(false)
  // const [error, setError] = useState<Error>()
  // const [isReady, setIsReady] = useState(false)
  // const [ledger, setLedger] = useState<SubstrateApp | null>(null)

  // const refConnecting = useRef(false)
  // const refTransport = useRef<Transport | null>(null)

  const refIsBusy = useRef(false)

  const { ensureTransport, closeTransport } = useLedgerTransport()

  // useEffect(() => {
  //   return () => {
  //     // ensures the transport is closed on unmount, allowing other tabs to access the ledger
  //     // the persist argument can be used to prevent this behaviour, when the hook is used
  //     // in two components that need to share the ledger connection
  //     if (!persist && ledger?.transport) {
  //       safelyCloseTransport(ledger.transport as Transport).then(() => {
  //         refTransport.current = null
  //         setLedger(null)
  //       })
  //     }
  //   }
  // }, [ledger, persist])

  const getAddress = useCallback(
    async (accountIndex = 0, addressIndex = 0) => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        assert(getIsLedgerCapable(), t("Sorry, Ledger is not supported on your browser."))
        assert(!chain || chain.account !== "secp256k1", ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE)
        assert(app?.cla, ERROR_LEDGER_NO_APP)

        const transport = await ensureTransport()
        const ledger = new SubstrateApp(transport, app.cla, app.slip0044)

        return await getAccountAddress(ledger, accountIndex, addressIndex)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, app?.name ?? "Unknown app")
      } finally {
        refIsBusy.current = false
      }
    },
    [app, chain, closeTransport, ensureTransport, t],
  )

  const sign = useCallback(
    async (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountJsonHardwareSubstrate,
      registry: TypeRegistry,
    ) => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        assert(getIsLedgerCapable(), t("Sorry, Ledger is not supported on your browser."))
        assert(!chain || chain.account !== "secp256k1", ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE)
        assert(app?.cla, ERROR_LEDGER_NO_APP)

        const transport = await ensureTransport()
        const ledger = new SubstrateApp(transport, app.cla, app.slip0044)

        if (isJsonPayload(payload)) {
          return signJsonPayload(ledger, payload, account, registry)
        } else {
          return signRawPayload(ledger, payload, account)
        }
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, app?.name ?? "Unknown app")
      } finally {
        refIsBusy.current = false
      }
    },
    [app, chain, closeTransport, ensureTransport, t],
  )

  // const connectLedger = useCallback(
  //   async (resetError?: boolean) => {
  //     if (refConnecting.current) return
  //     refConnecting.current = true

  //     setIsReady(false)
  //     setIsLoading(true)
  //     // when displaying an error and polling silently, on the UI we don't want the error to disappear
  //     // so error should be cleared explicitly
  //     if (resetError) setError(undefined)

  //     try {
  //       assert(getIsLedgerCapable(), t("Sorry, Ledger is not supported on your browser."))
  //       assert(!chain || chain.account !== "secp256k1", ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE)
  //       assert(app?.cla, ERROR_LEDGER_NO_APP)

  //       refTransport.current = await safelyCreateTransport()

  //       const ledger = new SubstrateApp(refTransport.current, app.cla, app.slip0044)

  //       // verify that Ledger connection is ready by querying first address
  //       await Promise.race([
  //         safelyGetAddress(ledger, 0, 0),
  //         throwAfter(5_000, "Timeout on Ledger Substrate connection"),
  //       ])

  //       setLedger(ledger)
  //       setError(undefined)
  //       setIsReady(true)
  //     } catch (err) {
  //       log.error("connectLedger Substrate Legacy " + (err as Error).message, { err })

  //       try {
  //         if (
  //           refTransport.current &&
  //           "device" in refTransport.current &&
  //           // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //           (refTransport.current.device as any).opened // TODO look into this
  //         )
  //           await refTransport.current?.close()
  //         refTransport.current = null
  //       } catch (err2) {
  //         log.error("Can't close ledger transport", err2)
  //         // ignore
  //       }

  //       setLedger(null)
  //       setError(err as Error)
  //     }

  //     refConnecting.current = false
  //     setIsLoading(false)
  //   },
  //   [app, chain, t],
  // )

  // const { status, message, requiresManualRetry } = useMemo<{
  //   status: LedgerStatus
  //   message: string
  //   requiresManualRetry: boolean
  // }>(() => {
  //   if (error) return getLedgerErrorProps(error, app?.name ?? t("Unknown app"))

  //   if (isLoading)
  //     return {
  //       status: "connecting",
  //       message: t(`Connecting to Ledger...`),
  //       requiresManualRetry: false,
  //     }

  //   if (isReady)
  //     return {
  //       status: "ready",
  //       message: t("Successfully connected to Ledger."),
  //       requiresManualRetry: false,
  //     }

  //   return { status: "unknown", message: "", requiresManualRetry: false }
  // }, [isReady, isLoading, error, app, t])

  // // automatic connection (startup + polling)
  // // use a ref to avoid re-renders when refreshCounter changes
  // const refreshCounterRef = useRef(0)

  // // automatic connection (startup + polling)
  // useEffect(() => {
  //   connectLedger()
  // }, [connectLedger])

  // // if not connected, poll every 2 seconds
  // // this will recreate the ledger instance which triggers automatic connection
  // useSetInterval(() => {
  //   if (!isLoading && !requiresManualRetry && ["warning", "error", "unknown"].includes(status)) {
  //     refreshCounterRef.current += 1
  //     connectLedger()
  //   }
  // }, 2000)

  // // manual connection
  // const refresh = useCallback(() => {
  //   connectLedger(true)
  // }, [connectLedger])

  return {
    sign,
    getAddress,
    app,
  }
}
