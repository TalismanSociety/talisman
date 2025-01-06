import { TypeRegistry } from "@polkadot/types"
import { hexToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { PolkadotGenericApp } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import {
  AccountJsonHardwareSubstrate,
  isJsonPayload,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "extension-core"
import { t } from "i18next"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

import { getPolkadotLedgerDerivationPath } from "./common"
import { getCustomTalismanLedgerError, getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (ledger: PolkadotGenericApp) => Promise<T>

type UseLedgerSubstrateGenericProps = {
  legacyApp?: SubstrateAppParams | null
}

const DEFAULT_PROPS: UseLedgerSubstrateGenericProps = {}

export const useLedgerSubstrateGeneric = ({ legacyApp } = DEFAULT_PROPS) => {
  const { t } = useTranslation()
  const refIsBusy = useRef(false)
  const { ensureTransport, closeTransport } = useLedgerTransport()

  const withLedger = useCallback(
    async <T>(request: LedgerRequest<T>): Promise<T> => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new PolkadotGenericApp(transport)

        return await request(ledger)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, legacyApp ? "Polkadot Migration" : "Polkadot")
      } finally {
        refIsBusy.current = false
      }
    },
    [closeTransport, ensureTransport, legacyApp, t],
  )

  const sign = useCallback(
    (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountJsonHardwareSubstrate,
      registry?: TypeRegistry | null,
      txMetadata?: string | null,
    ) => {
      return withLedger((ledger) => {
        return signPayload(ledger, payload, account, legacyApp, registry, txMetadata)
      })
    },
    [withLedger, legacyApp],
  )

  const getAddress = useCallback(
    (bip44path: string, ss58prefix = 42) => {
      return withLedger((ledger) => {
        return ledger.getAddress(bip44path, ss58prefix, false)
      })
    },
    [withLedger],
  )

  return {
    getAddress,
    sign,
  }
}

const signPayload = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  legacyApp?: SubstrateAppParams | null,
  registry?: TypeRegistry | null,
  txMetadata?: string | null,
) => {
  if (!ledger) throw new Error("Ledger not connected")

  const path = getPolkadotLedgerDerivationPath({ ...account, legacyApp })

  if (isJsonPayload(payload)) {
    if (!payload.withSignedTransaction)
      throw getCustomTalismanLedgerError(
        t("This dapp needs to be updated in order to support Ledger signing."),
      )
    if (!registry) throw getCustomTalismanLedgerError(t("Missing registry."))

    const hasCheckMetadataHash = registry.metadata.extrinsic.signedExtensions.some(
      (ext) => ext.identifier.toString() === "CheckMetadataHash",
    )
    if (!hasCheckMetadataHash)
      throw getCustomTalismanLedgerError(
        t("This network doesn't support Ledger Polkadot Generic App."),
      )
    if (!txMetadata) throw getCustomTalismanLedgerError(t("Missing short metadata"))

    const unsigned = registry.createType("ExtrinsicPayload", payload)

    const blob = Buffer.from(unsigned.toU8a(true))
    const metadata = Buffer.from(hexToU8a(txMetadata))

    const { signature } = await ledger.signWithMetadata(path, blob, metadata)

    return u8aToHex(new Uint8Array(signature))
  } else {
    // raw payload
    const unsigned = u8aWrapBytes(payload.data)

    const { signature } = await ledger.signRaw(path, Buffer.from(unsigned))

    // skip first byte (sig type) or signatureVerify fails, this seems specific to ed25519 signatures
    return u8aToHex(new Uint8Array(signature.slice(1)))
  }
}
