import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { isVersionedTransaction } from "@talismn/solana"
import { AccountOfType } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSolana } from "@ui/hooks/ledger/useLedgerSolana"

import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export type SolSignPayload =
  | {
      type: "transaction"
      transaction: Transaction | VersionedTransaction
    }
  | {
      type: "message"
      message: Buffer<ArrayBufferLike>
    }

export const SignLedgerSolana: FC<{
  account: AccountOfType<"ledger-solana">
  payload: SolSignPayload
  containerId?: string
  className?: string
  disabled?: boolean
  onSigned: (arg: {
    unsigned: Buffer<ArrayBufferLike>
    signature: Buffer<ArrayBufferLike>
  }) => void | Promise<void>
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void // triggered when tx is sent
}> = ({
  account,
  className = "",
  payload,
  containerId,
  disabled,
  onSentToDevice,
  onSigned,
  onCancel,
}) => {
  const { t } = useTranslation()
  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const { sign } = useLedgerSolana()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      switch (payload.type) {
        case "transaction": {
          const tx = payload.transaction

          if (isVersionedTransaction(tx))
            throw getTalismanLedgerError(
              t("Solana versioned transactions cannot be signed with Ledger yet."),
            )

          const unsigned = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })
          const signature = await sign("transaction", tx.serializeMessage(), account)
          await onSigned({ unsigned, signature })
          break
        }
        case "message": {
          throw getTalismanLedgerError(t("Solana messages cannot be signed with Ledger yet."))
          // const unsigned = payload.message
          // const signature = await sign("message", unsigned, account)
          // await onSigned({ unsigned, signature })
        }
      }
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [account, onSentToDevice, onSigned, payload, setError, setIsSigning, sign, t])

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
