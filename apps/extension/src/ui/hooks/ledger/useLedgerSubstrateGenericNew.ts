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
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

import { getPolkadotLedgerDerivationPath } from "./common"
import { getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type UseLedgerSubstrateGenericProps = {
  legacyApp?: SubstrateAppParams | null
}

const DEFAULT_PROPS: UseLedgerSubstrateGenericProps = {}

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
    if (!txMetadata) throw new Error("Missing metadata")
    if (!registry) throw new Error("Missing registry")

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

export const useLedgerSubstrateGeneric = ({ legacyApp } = DEFAULT_PROPS) => {
  const { t } = useTranslation()

  const refIsBusy = useRef(false)

  const { ensureTransport, closeTransport } = useLedgerTransport()

  const sign = useCallback(
    async (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountJsonHardwareSubstrate,
      registry?: TypeRegistry | null,
      txMetadata?: string | null,
    ) => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new PolkadotGenericApp(transport)

        return await signPayload(ledger, payload, account, legacyApp, registry, txMetadata)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, legacyApp ? "Polkadot Migration" : "Polkadot")
      } finally {
        refIsBusy.current = false
      }
    },
    [t, ensureTransport, legacyApp, closeTransport],
  )

  const getAddress = useCallback(
    async (bip44path: string, ss58prefix = 42) => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new PolkadotGenericApp(transport)

        return await ledger.getAddress(bip44path, ss58prefix, false)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, legacyApp ? "Polkadot Migration" : "Polkadot")
      } finally {
        refIsBusy.current = false
      }
    },
    [t, ensureTransport, closeTransport, legacyApp],
  )

  return {
    getAddress,
    sign,
  }
}
