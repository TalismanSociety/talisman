import { PublicKey, Transaction } from "@solana/web3.js"
import { solTransactionToJson } from "@talismn/solana"
import { classNames } from "@talismn/util"
import { isAccountOwned, isAccountPlatformSolana } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

import { SignLedgerSolana, SolSignPayload } from "../SignLedgerSolana"
import { TxSignButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonSol: FC<TxSubmitButtonProps<"solana">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const address = useMemo(() => tx.payload.feePayer?.toBase58(), [tx.payload])
  const account = useAccountByAddress(address)

  const handleLedgerSignature = useCallback(
    async ({
      unsigned,
      signature,
    }: {
      unsigned: Buffer<ArrayBufferLike>
      signature: Buffer<ArrayBufferLike>
    }) => {
      try {
        if (!account) return

        const transaction = Transaction.from(unsigned)
        transaction.addSignature(new PublicKey(account.address), signature)

        const serialized = solTransactionToJson(transaction)
        if (!serialized) throw new Error("Failed to serialize transaction request")

        const submitted = await api.solSubmit(tx.networkId, serialized, tx.txInfo)

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
    [account, onSubmit, tx],
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const serialized = solTransactionToJson(tx.payload)
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
    return <TxSignButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-solana":
      return (
        <SignLedgerSolana
          account={account}
          payload={payload}
          className={className}
          containerId={containerId}
          networkId={tx.networkId}
          onSigned={handleLedgerSignature}
        />
      )
    default:
      return (
        <Button
          processing={isSubmitting}
          onClick={handleSubmitClick}
          className={classNames("w-full", className)}
          primary
        >
          {label ?? t("Approve")}
        </Button>
      )
  }
}
