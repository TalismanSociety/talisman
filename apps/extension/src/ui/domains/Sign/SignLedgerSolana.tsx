import { log } from "@common/log"
import type { AccountOfType } from "@core/domains/keyring/exports"
import type { SolTransaction } from "@talismn/solana"
import { attachTransactionSignature } from "@talismn/solana"
import { getTalismanLedgerError } from "@ui/hooks/ledger/errors"
import { useLedgerSolana } from "@ui/hooks/ledger/useLedgerSolana"
import { type FC, useCallback } from "react"

import { SignLedgerBase } from "./SignLedgerBase"
import { useSignLedgerBase } from "./useSignLedgerBase"

export type SolSignPayload =
  | {
      type: "transaction"
      transaction: SolTransaction
    }
  | {
      type: "message"
      message: Buffer<ArrayBufferLike>
    }

export type SolSignOutput =
  | {
      type: "transaction"
      transaction: SolTransaction
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
          // the ledger app signs the raw message bytes, for both legacy and versioned transactions
          const signature = await sign(
            "transaction",
            Buffer.from(payload.transaction.messageBytes),
            account
          )

          // the signatures map is keyed by signer address - no index juggling needed
          const transaction = attachTransactionSignature(
            payload.transaction,
            account.address,
            signature
          )

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
