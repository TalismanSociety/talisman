import { classNames } from "@talismn/util"
import { isAccountPlatformEthereum, serializeTransactionRequest } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { BaseError } from "viem"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useAccountByAddress } from "@ui/state"

import { SignApproveButton } from "../SignApproveButton"
import { SignLedgerEthereum } from "../SignLedgerEthereum"
import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonEth: FC<TxSubmitButtonProps<"ethereum">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(tx.payload.from)

  const handleLedgerSignature = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      try {
        const serialized = serializeTransactionRequest(tx.payload)
        if (!serialized) throw new Error("Failed to serialize transaction request")

        const hash = await api.ethSendSigned(tx.networkId, serialized, signature, tx.txInfo)

        onSubmit(hash)
      } catch (cause) {
        log.error("Failed to submit tx", { cause, tx })
        notify({
          title: `Failed to submit`,
          type: "error",
          subtitle: (cause as BaseError).shortMessage ?? (cause as Error)?.message,
        })
      }
    },
    [onSubmit, tx],
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const serialized = serializeTransactionRequest(tx.payload)
      if (!serialized) throw new Error("Failed to serialize transaction request")

      const hash = await api.ethSignAndSend(tx.networkId, serialized, tx.txInfo)

      onSubmit(hash)
    } catch (cause) {
      log.error("Failed to submit tx", { cause, tx })
      notify({
        title: `Failed to submit`,
        type: "error",
        subtitle: (cause as BaseError).shortMessage ?? (cause as Error)?.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit, tx])

  if (!isAccountPlatformEthereum(account))
    return <TxSubmitButtonFallback label={label} className={className} />

  switch (account.type) {
    case "ledger-ethereum":
      return (
        <SignLedgerEthereum
          account={account}
          method="eth_sendTransaction"
          payload={tx.payload}
          className={className}
          containerId={containerId}
          evmNetworkId={tx.networkId}
          onSigned={handleLedgerSignature}
        />
      )
  }

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
