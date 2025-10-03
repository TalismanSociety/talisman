import { isVersionedTransaction, serializeTransaction } from "@talismn/solana"
import { classNames } from "@talismn/util"
import { isAccountOwned, isAccountPlatformSolana } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

import { SignApproveButton } from "../SignApproveButton"
import { SignLedgerSolana, SolSignOutput, SolSignPayload } from "../SignLedgerSolana"
import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonSol: FC<TxSubmitButtonProps<"solana">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const address = useMemo(() => {
    const transaction = tx.payload
    if (isVersionedTransaction(transaction))
      return transaction.message.staticAccountKeys
        .find((key, idx) => transaction.message.isAccountSigner(idx))
        ?.toBase58()
    else return transaction.feePayer?.toBase58()
  }, [tx.payload])
  const account = useAccountByAddress(address)

  const handleLedgerSignature = useCallback(
    async (output: SolSignOutput) => {
      try {
        if (output.type !== "transaction") throw new Error("Unexpected output from Ledger signing")

        const submitted = await api.solSubmit(
          tx.networkId,
          serializeTransaction(output.transaction),
          tx.txInfo,
        )

        onSubmit(submitted.signature)
      } catch (cause) {
        log.error("Failed to submit tx", { cause, tx })
        notify({
          title: `Failed to submit`,
          type: "error",
          subtitle: (cause as Error)?.message,
        })
      }
    },
    [onSubmit, tx],
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const serialized = serializeTransaction(tx.payload)
      if (!serialized) throw new Error("Failed to serialize transaction request")

      const { signature } = await api.solSubmit(tx.networkId, serialized, tx.txInfo)

      onSubmit(signature)
    } catch (cause) {
      log.error("Failed to submit tx", { cause, tx })
      notify({
        title: `Failed to submit`,
        type: "error",
        subtitle: (cause as Error)?.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit, tx])

  const payload = useMemo<SolSignPayload>(() => {
    return { type: "transaction", transaction: tx.payload }
  }, [tx.payload])

  if (!isAccountPlatformSolana(account) || !isAccountOwned(account))
    return <TxSubmitButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-solana":
      return (
        <SignLedgerSolana
          account={account}
          payload={payload}
          className={className}
          containerId={containerId}
          onSigned={handleLedgerSignature}
        />
      )
    default:
      return (
        <SignApproveButton
          processing={isSubmitting}
          onClick={handleSubmitClick}
          className={classNames("w-full", className)}
          primary
        >
          {label ?? t("Approve")}
        </SignApproveButton>
      )
  }
}
