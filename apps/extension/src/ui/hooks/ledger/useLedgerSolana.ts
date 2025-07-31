import LedgerSolanaApp from "@ledgerhq/hw-app-solana"
import { encodeAddressSolana, isAddressEqual } from "@talismn/crypto"
import { AccountLedgerSolana } from "extension-core"
import { t } from "i18next"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (ledger: LedgerSolanaApp) => Promise<T>

export const useLedgerSolana = () => {
  const { t } = useTranslation()
  const refIsBusy = useRef(false)
  const { ensureTransport, closeTransport } = useLedgerTransport()

  const withLedger = useCallback(
    async <T>(request: LedgerRequest<T>): Promise<T> => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))

      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        const ledger = new LedgerSolanaApp(transport)

        return await request(ledger)
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, "Solana")
      } finally {
        refIsBusy.current = false
      }
    },
    [closeTransport, ensureTransport, t],
  )

  const sign = useCallback(
    (
      type: "message" | "transaction",
      payload: Buffer<ArrayBufferLike>,
      account: AccountLedgerSolana,
    ) => {
      return withLedger((ledger) => signWithLedger(ledger, type, payload, account))
    },
    [withLedger],
  )

  const getAddress = useCallback(
    (derivationPath: string) => {
      return withLedger((ledger) => ledger.getAddress(derivationPath, false))
    },
    [withLedger],
  )

  return {
    getAddress,
    sign,
  }
}

const signWithLedger = async (
  ledger: LedgerSolanaApp,
  type: "message" | "transaction",
  payload: Buffer<ArrayBufferLike>,
  account: AccountLedgerSolana,
) => {
  const address = encodeAddressSolana(
    (await ledger.getAddress(account.derivationPath, false)).address,
  )
  if (!isAddressEqual(address, account.address))
    throw getTalismanLedgerError(
      t(
        "Connected Ledger device does not match the selected account. Please connect the correct device and retry.",
      ),
    )

  switch (type) {
    case "message": {
      throw getTalismanLedgerError(t("Solana message signing with Ledger is not supported."))

      const res = await ledger.signOffchainMessage(account.derivationPath, payload)
      return res.signature
    }
    case "transaction": {
      const res = await ledger.signTransaction(account.derivationPath, payload)
      return res.signature
    }
  }
}
