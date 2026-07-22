import { log } from "@common/log"
import { isAccountOwned, isAccountPlatformBitcoin } from "@core/domains/keyring/exports"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "@ui/api"
import { notify } from "@ui/components/Notifications"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { SignApproveButton } from "../SignApproveButton"
import { SignLedgerBitcoin } from "../SignLedgerBitcoin"
import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import type { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonBtc: FC<TxSubmitButtonProps<"bitcoin">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(tx.address)
  const queryClient = useQueryClient()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = useCallback(
    async (psbtBase64: string) => {
      const { txid } = await api.btcSubmit({
        networkId: tx.networkId,
        address: tx.address,
        psbtBase64,
        maxFeeSats: tx.maxFeeSats,
        replacesTxid: tx.replacesTxid,
        txInfo: tx.txInfo,
      })
      // the broadcast spent utxos and consumed addresses: anything built from the old
      // scan would double-spend, drop it all
      queryClient.invalidateQueries({ queryKey: ["btcUtxos"] })
      queryClient.invalidateQueries({ queryKey: ["btcChangeAddress"] })
      queryClient.invalidateQueries({ queryKey: ["btcReplacePreview"] })
      onSubmit(txid)
    },
    [onSubmit, queryClient, tx]
  )

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await submit(tx.payload)
    } catch (cause) {
      log.error("Failed to submit tx", { cause, tx })
      notify({ title: `Failed to submit`, type: "error", subtitle: (cause as Error)?.message })
    } finally {
      setIsSubmitting(false)
    }
  }, [submit, tx])

  const handleLedgerSigned = useCallback(
    async (signedPsbtBase64: string) => {
      try {
        // background verifies the signed PSBT, finalizes and broadcasts
        await submit(signedPsbtBase64)
      } catch (cause) {
        log.error("Failed to submit ledger tx", { cause, tx })
        notify({ title: `Failed to submit`, type: "error", subtitle: (cause as Error)?.message })
      }
    },
    [submit, tx]
  )

  if (!isAccountPlatformBitcoin(account) || !isAccountOwned(account))
    return <TxSubmitButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-bitcoin":
      return (
        <SignLedgerBitcoin
          account={account}
          psbtBase64={tx.payload}
          tree={tx.tree}
          containerId={containerId}
          className={className}
          onSigned={handleLedgerSigned}
        />
      )
    default:
      return (
        <SignApproveButton
          processing={isSubmitting}
          onClick={handleSubmitClick}
          className={cn("w-full", className)}
          primary
        >
          {label ?? t("Approve")}
        </SignApproveButton>
      )
  }
}
