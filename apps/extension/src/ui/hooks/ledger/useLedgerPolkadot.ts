import { TypeRegistry } from "@polkadot/types"
import { hexToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util"
import { isAddressEqual } from "@talismn/crypto"
import { PolkadotGenericApp, supportedApps } from "@zondax/ledger-substrate"
import { SubstrateAppParams } from "@zondax/ledger-substrate/dist/common"
import {
  AccountLedgerPolkadot,
  isJsonPayload,
  LedgerPolkadotCurve,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "extension-core"
import { t } from "i18next"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { lt } from "semver"

import { getPolkadotLedgerDerivationPath } from "./common"
import { getOpenLedgerAppError, getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (ledger: PolkadotGenericApp) => Promise<T>

type UseLedgerPolkadotProps = {
  legacyApp?: SubstrateAppParams | null
}

const DEFAULT_PROPS: UseLedgerPolkadotProps = {}

export const useLedgerPolkadot = ({ legacyApp } = DEFAULT_PROPS) => {
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
        const appName =
          !legacyApp || legacyApp?.name === "Polkadot" ? "Polkadot" : "Polkadot Migration"
        throw getTalismanLedgerError(err, appName)
      } finally {
        refIsBusy.current = false
      }
    },
    [closeTransport, ensureTransport, legacyApp, t],
  )

  const sign = useCallback(
    (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountLedgerPolkadot,
      registry?: TypeRegistry | null,
      txMetadata?: string | null,
    ) => {
      return withLedger((ledger) => {
        return signPayload(ledger, payload, account, registry, txMetadata)
      })
    },
    [withLedger],
  )

  const getAddressEd25519 = useCallback(
    (bip44path: string, ss58prefix = 42) => {
      return withLedger((ledger) => {
        return ledger.getAddressEd25519(bip44path, ss58prefix, false)
      })
    },
    [withLedger],
  )

  const getAddressEcdsa = useCallback(
    (bip44path: string) => {
      return withLedger(async (ledger) => {
        // check if installed app supports secp256k1 accounts
        const appInfo = await ledger.appInfo()
        if (!appInfo.appVersion) throw getTalismanLedgerError("Failed to get app version")
        if (lt(appInfo.appVersion, "100.0.14"))
          throw getTalismanLedgerError("Please update your Ledger Polkadot app from Ledger Live")

        return ledger.getAddressEcdsa(bip44path, false)
      })
    },
    [withLedger],
  )

  return {
    getAddressEd25519,
    getAddressEcdsa,
    sign,
  }
}

const getAddress = async (ledger: PolkadotGenericApp, path: string, curve: LedgerPolkadotCurve) => {
  switch (curve) {
    case "ed25519": {
      const { address } = await ledger.getAddressEd25519(path, 42)
      return address
    }
    case "ethereum": {
      const { address } = await ledger.getAddressEcdsa(path)
      return `0x${address}`
    }
  }
}

const signWithMetadata = (
  ledger: PolkadotGenericApp,
  curve: LedgerPolkadotCurve,
  path: string,
  txBlob: Buffer<ArrayBuffer>,
  txMetadata: Buffer<ArrayBuffer>,
) => {
  switch (curve) {
    case "ed25519":
      return ledger.signWithMetadataEd25519(path, txBlob, txMetadata)
    case "ethereum":
      return ledger.signWithMetadataEcdsa(path, txBlob, txMetadata)
  }
}

const signRawPayload = async (
  ledger: PolkadotGenericApp,
  curve: LedgerPolkadotCurve,
  path: string,
  txBlob: Buffer<ArrayBuffer>,
) => {
  switch (curve) {
    case "ed25519": {
      const { signature } = await ledger.signRawEd25519(path, txBlob)
      // skip first byte (sig type) or signatureVerify fails, this seems specific to ed25519 signatures
      return signature.slice(1)
    }
    case "ethereum": {
      const { signature } = await ledger.signRawEcdsa(path, txBlob)
      return signature
    }
  }
}

const signPayload = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountLedgerPolkadot,
  registry?: TypeRegistry | null,
  txMetadata?: string | null,
) => {
  if (!ledger) throw new Error("Ledger not connected")

  // check correct app: 249 is the expected CLA for both polkadot app and polkadot migration app
  if (ledger.CLA !== 249)
    throw getOpenLedgerAppError(account.app ? "Polkadot" : "Polkadot Migration")

  // find the app that defines which derivation path to use
  const app = supportedApps.find((a) => a.name === (account.app ?? "Polkadot"))
  if (!app)
    throw getTalismanLedgerError(
      t("Could not find which Ledger app can be used with this account. Please contact support."),
    )

  // check correct address
  const path = getPolkadotLedgerDerivationPath({ ...account, legacyApp: app })

  const address = await getAddress(ledger, path, account.curve)
  if (!isAddressEqual(address, account.address))
    throw getTalismanLedgerError(
      t(
        "Connected Ledger device does not match the selected account. Please connect the correct device and retry.",
      ),
    )

  if (isJsonPayload(payload)) {
    if (!payload.withSignedTransaction)
      throw getTalismanLedgerError(
        t("This dapp needs to be updated in order to support Ledger signing."),
      )
    if (!registry) throw getTalismanLedgerError(t("Missing registry."))

    const hasCheckMetadataHash = registry.metadata.extrinsic.transactionExtensions.some(
      (ext) => ext.identifier.toString() === "CheckMetadataHash",
    )
    if (!hasCheckMetadataHash)
      throw getTalismanLedgerError(t("This network doesn't support Ledger Polkadot Generic App."))
    if (!txMetadata) throw getTalismanLedgerError(t("Missing short metadata"))

    const unsigned = registry.createType("ExtrinsicPayload", payload)

    const blob = Buffer.from(unsigned.toU8a(true))
    const metadata = Buffer.from(hexToU8a(txMetadata))

    const { signature } = await signWithMetadata(ledger, account.curve, path, blob, metadata)

    return u8aToHex(new Uint8Array(signature))
  } else {
    // raw payload
    const unsigned = u8aWrapBytes(payload.data)

    const signature = await signRawPayload(ledger, account.curve, path, Buffer.from(unsigned))

    return u8aToHex(new Uint8Array(signature))
  }
}
