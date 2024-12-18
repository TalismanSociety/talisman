import Transport from "@ledgerhq/hw-transport"
import TransportWebUSB from "@ledgerhq/hw-transport-webusb"
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
import { log } from "extension-shared"
import { useCallback, useEffect, useRef } from "react"

import { getPolkadotLedgerDerivationPath, LedgerError } from "./common"
import { getTalismanLedgerError } from "./errors"

type UseLedgerSubstrateGenericProps = {
  legacyApp?: SubstrateAppParams | null
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

const signPayload = async (
  ledger: PolkadotGenericApp,
  payload: SignerPayloadJSON | SignerPayloadRaw,
  account: AccountJsonHardwareSubstrate,
  legacyApp?: SubstrateAppParams | null,
  registry?: TypeRegistry | null,
  txMetadata?: string | null,
) => {
  if (!ledger) throw new Error("Ledger not connected")

  const path = getPolkadotLedgerDerivationPath({ ...account, legacyApp: legacyApp })

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
  const refTransport = useRef<Transport | null>(null)
  const refIsBusy = useRef(false)

  const ensureTransport = useCallback(async () => {
    if (!refTransport.current) {
      refTransport.current = await safelyCreateTransport()
      refTransport.current.on("disconnect", () => {
        refTransport.current = null
      })
    }

    return refTransport.current!
  }, [])

  const closeTransport = useCallback(async () => {
    if (!refTransport.current) return

    await safelyCloseTransport(refTransport.current)
    refTransport.current = null
  }, [])

  const sign = useCallback(
    async (
      payload: SignerPayloadJSON | SignerPayloadRaw,
      account: AccountJsonHardwareSubstrate,
      registry?: TypeRegistry | null,
      txMetadata?: string | null,
    ) => {
      if (refIsBusy.current) throw new Error("Ledger is busy")

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new PolkadotGenericApp(transport)

        return await signPayload(ledger, payload, account, legacyApp, registry, txMetadata)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(
          err as LedgerError,
          legacyApp ? "Polkadot Migration" : "Polkadot",
        )
      } finally {
        refIsBusy.current = false
      }
    },
    [legacyApp, closeTransport, ensureTransport],
  )

  const getAddress = useCallback(
    async (bip44path: string, ss58prefix = 42) => {
      if (refIsBusy.current) throw new Error("Ledger is busy")

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new PolkadotGenericApp(transport)

        return await ledger.getAddress(bip44path, ss58prefix, false)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(
          err as LedgerError,
          legacyApp ? "Polkadot Migration" : "Polkadot",
        )
      } finally {
        refIsBusy.current = false
      }
    },
    [legacyApp, closeTransport, ensureTransport],
  )

  useEffect(() => {
    return () => {
      if (refTransport.current) safelyCloseTransport(refTransport.current).catch(log.error)
    }
  }, [])

  return {
    getAddress,
    sign,
  }
}
