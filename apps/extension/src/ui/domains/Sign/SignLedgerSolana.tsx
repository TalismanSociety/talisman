import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js"
import { isVersionedTransaction } from "@talismn/solana"
import { AccountOfType } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback } from "react"

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

export type SolSignOutput =
  | {
      type: "transaction"
      transaction: Transaction | VersionedTransaction
    }
  | {
      type: "message"
      signature: Buffer<ArrayBufferLike>
    }

export const SignLedgerSolana: FC<{
  account: AccountOfType<"ledger-solana">
  payload: SolSignPayload
  containerId?: string
  className?: string
  disabled?: boolean
  onSigned: (arg: SolSignOutput) => void | Promise<void>
  onCancel?: () => void
  onSentToDevice?: (sent: boolean) => void
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
  const { isSigning, error, setIsSigning, setError } = useSignLedgerBase()

  const { sign } = useLedgerSolana()

  const signWithLedger = useCallback(async () => {
    if (!payload || !onSigned || !account) return

    onSentToDevice?.(true)
    setIsSigning(true)

    try {
      switch (payload.type) {
        case "transaction": {
          const transaction = payload.transaction

          if (isVersionedTransaction(transaction)) {
            const signature = await sign(
              "transaction",
              Buffer.from(transaction.message.serialize()),
              account,
            )

            // attach the signature, must be done at the correct index (same as in tx.message.staticAccountKeys)
            transaction.signatures[0] = signature
          } else {
            const signature = await sign("transaction", transaction.serializeMessage(), account)
            transaction.addSignature(new PublicKey(account.address), signature)
          }

          await onSigned({
            type: "transaction",
            transaction,
          })

          break
        }
        case "message": {
          const signature = await sign("message", payload.message, account)
          await onSigned({ type: "message", signature })
        }
      }
    } catch (err) {
      const error = getTalismanLedgerError(err)
      log.error("signLedger", { error })
      setError(error)
    } finally {
      onSentToDevice?.(false)
    }
  }, [account, onSentToDevice, onSigned, payload, setError, setIsSigning, sign])

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
