import { TypeRegistry } from "@polkadot/types"
import { u8aToHex, u8aWrapBytes } from "@polkadot/util"
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

import { LEDGER_HARDENED_OFFSET, LEDGER_SUCCESS_CODE } from "./common"
import {
  ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE,
  ERROR_LEDGER_NO_APP,
  getCustomNativeLedgerError,
  getTalismanLedgerError,
  TalismanLedgerError,
} from "./errors"
import { useLedgerSubstrateAppByChain } from "./useLedgerSubstrateApp"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (ledger: SubstrateApp) => Promise<T>

export const useLedgerSubstrateLegacy = (genesis?: string | null) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(genesis)
  const app = useLedgerSubstrateAppByChain(chain)
  const { ensureTransport, closeTransport } = useLedgerTransport()
  const refIsBusy = useRef(false)

  const withLedger = useCallback(
    async <T>(request: LedgerRequest<T>): Promise<T> => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        if (chain?.account === "secp256k1")
          throw new TalismanLedgerError("Unknown", ERROR_LEDGER_EVM_CANNOT_SIGN_SUBSTRATE)
        if (!app?.cla) throw new TalismanLedgerError("Unknown", ERROR_LEDGER_NO_APP)

        const transport = await ensureTransport()
        const ledger = new SubstrateApp(transport, app.cla, app.slip0044)

        return await request(ledger)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, app?.name ?? "Unknown app")
      } finally {
        refIsBusy.current = false
      }
    },
    [app, chain?.account, closeTransport, ensureTransport, t],
  )

  const getAddress = useCallback(
    (accountIndex = 0, addressIndex = 0) => {
      return withLedger((ledger) => getAccountAddress(ledger, accountIndex, addressIndex))
    },
    [withLedger],
  )

  const sign = useCallback(
    (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountJsonHardwareSubstrate,
      registry: TypeRegistry,
    ) => {
      return withLedger((ledger) =>
        isJsonPayload(payload)
          ? signJsonPayload(ledger, payload, account, registry)
          : signRawPayload(ledger, payload, account),
      )
    },
    [withLedger],
  )

  return {
    sign,
    getAddress,
    app,
  }
}

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
    throw getCustomNativeLedgerError(
      error_message || "Ledger provided an empty address",
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
    )

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
    throw getCustomNativeLedgerError(error_message, return_code)

  return u8aToHex(new Uint8Array(signatureBuffer))
}

const signRawPayload = async (
  ledger: SubstrateApp,
  payload: SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
) => {
  const unsigned = u8aWrapBytes(payload.data)
  if (unsigned.length > 256)
    throw new TalismanLedgerError(
      "InvalidRequest",
      t("The message is too long to be signed with Ledger."),
    )

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
    throw getCustomNativeLedgerError(error_message, return_code)

  // skip first byte (sig type) or signatureVerify fails, this seems specific to ed25519 signatures
  return u8aToHex(new Uint8Array(signatureBuffer.slice(1)))
}
