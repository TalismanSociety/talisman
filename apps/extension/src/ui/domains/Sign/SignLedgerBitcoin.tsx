import { log } from "@common/log"
import type { AccountOfType } from "@core/domains/keyring/exports"
import { attachPartialSignatures, type HardwarePartialSignature } from "@talismn/bitcoin"
import { base64 } from "@talismn/crypto"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerBitcoin } from "@ui/hooks/ledger/useLedgerBitcoin"
import { type FC, useCallback } from "react"

import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export const SignLedgerBitcoin: FC<{
  account: AccountOfType<"ledger-bitcoin">
  /** unsigned PSBT (base64) with bip32-derivation fields populated */
  psbtBase64: string
  /** which tree the PSBT spends — bitcoin ledger v1 restricts a tx to one tree */
  tree: "payments" | "ordinals"
  containerId?: string
  className?: string
  disabled?: boolean
  /** receives the fully-signed PSBT (base64) ready to broadcast */
  onSigned: (signedPsbtBase64: string) => void | Promise<void>
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
}> = ({
  account,
  className = "",
  psbtBase64,
  tree,
  containerId,
  disabled,
  onSentToDevice,
  onSigned,
  onCancel,
}) => {
  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()
  const { signPsbt } = useLedgerBitcoin()

  const signWithLedger = useCallback(async () => {
    if (!psbtBase64 || !onSigned || !account) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      const treeKeys = account.keys[tree]
      const partials = await signPsbt({
        psbtBase64,
        tree,
        accountDerivationPath: treeKeys.derivationPath,
        xpub: treeKeys.xpub,
        masterFingerprint: account.masterFingerprint,
      })

      const signatures: HardwarePartialSignature[] = partials.map(([inputIndex, sig]) => ({
        inputIndex,
        pubkey: new Uint8Array(sig.pubkey),
        signature: new Uint8Array(sig.signature),
        tapleafHash: sig.tapleafHash ? new Uint8Array(sig.tapleafHash) : undefined,
      }))

      const signed = attachPartialSignatures(base64.decode(psbtBase64), signatures)
      await onSigned(base64.encode(signed))
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("signLedgerBitcoin", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [account, onSentToDevice, onSigned, psbtBase64, tree, setError, setIsSigning, signPsbt])

  return (
    <SignLedgerBase
      containerId={containerId}
      disabled={disabled}
      isProcessing={isSigning}
      error={error}
      className={className}
      onSignClick={signWithLedger}
      onDismissErrorClick={() => setError(null)}
      onCancel={onCancel}
    />
  )
}
