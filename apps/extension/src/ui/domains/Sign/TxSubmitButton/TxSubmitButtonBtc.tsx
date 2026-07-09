import { log } from "@common/log"
import { isAccountOwned, isAccountPlatformBitcoin } from "@core/domains/keyring/exports"
import { api } from "@ui/api"
import { notify } from "@ui/components/Notifications"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { SignApproveButton } from "../SignApproveButton"
import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import type { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonBtc: FC<TxSubmitButtonProps<"bitcoin">> = ({
  tx,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(tx.address)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const { txid } = await api.btcSubmit({
        networkId: tx.networkId,
        address: tx.address,
        psbtBase64: tx.payload,
        maxFeeSats: tx.maxFeeSats,
        txInfo: tx.txInfo,
      })

      onSubmit(txid)
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

  if (!isAccountPlatformBitcoin(account) || !isAccountOwned(account))
    return <TxSubmitButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-bitcoin":
      // TODO hardware signing (SignLedgerBitcoin)
      return (
        <TxSubmitButtonFallback
          label={t("Ledger signing not supported yet")}
          className={className}
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
