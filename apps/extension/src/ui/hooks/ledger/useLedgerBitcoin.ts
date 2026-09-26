import { AppClient, DefaultWalletPolicy, type PartialSignature } from "ledger-bitcoin"
import { useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError, TalismanLedgerError } from "./errors"
import { useLedgerTransport } from "./useLedgerTransport"

type LedgerRequest<T> = (app: AppClient) => Promise<T>

export type LedgerBitcoinSignInput = {
  /** unsigned PSBT (base64) with bip32-derivation fields populated */
  psbtBase64: string
  /** which tree the PSBT spends — determines the wallet policy descriptor */
  tree: "payments" | "ordinals"
  /** account-level derivation path, e.g. "m/84'/0'/0'" */
  accountDerivationPath: string
  /** account-level xpub for the spent tree */
  xpub: string
  masterFingerprint: `0x${string}`
}

/** hex master fingerprint without the 0x prefix, as ledger-bitcoin key origins expect */
const toKeyOrigin = (masterFingerprint: string, path: string, xpub: string) =>
  `[${masterFingerprint.replace(/^0x/, "")}${path.replace(/^m/, "")}]${xpub}`

export const useLedgerBitcoin = () => {
  const { t } = useTranslation()
  const refIsBusy = useRef(false)
  const { ensureTransport, closeTransport } = useLedgerTransport()

  const withLedger = useCallback(
    async <T>(request: LedgerRequest<T>): Promise<T> => {
      if (refIsBusy.current) throw new TalismanLedgerError("Busy", t("Ledger is busy"))
      refIsBusy.current = true

      try {
        const transport = await ensureTransport()
        return await request(new AppClient(transport))
      } catch (err) {
        await closeTransport()
        throw getTalismanLedgerError(err, "Bitcoin")
      } finally {
        refIsBusy.current = false
      }
    },
    [closeTransport, ensureTransport, t]
  )

  const getMasterFingerprint = useCallback(
    () => withLedger((app) => app.getMasterFingerprint()),
    [withLedger]
  )

  const getExtendedPubkey = useCallback(
    (derivationPath: string) => withLedger((app) => app.getExtendedPubkey(derivationPath, false)),
    [withLedger]
  )

  const signPsbt = useCallback(
    (input: LedgerBitcoinSignInput): Promise<Array<[number, PartialSignature]>> =>
      withLedger(async (app) => {
        const descriptorTemplate = input.tree === "ordinals" ? "tr(@0/**)" : "wpkh(@0/**)"
        const policy = new DefaultWalletPolicy(
          descriptorTemplate,
          toKeyOrigin(input.masterFingerprint, input.accountDerivationPath, input.xpub)
        )
        // standard singlesig policies need no registration → null hmac
        return app.signPsbt(input.psbtBase64, policy, null)
      }),
    [withLedger]
  )

  return { getMasterFingerprint, getExtendedPubkey, signPsbt }
}
