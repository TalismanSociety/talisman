import { log } from "@common/log"
import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import { isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import { getErrorMessage } from "@talismn/util"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "@ui/api"
import { notify } from "@ui/components/Notifications"
import { invalidateNonceQueries } from "@ui/domains/Ethereum/useEthTransaction"
import { useReportPayloadLock } from "@ui/hooks/useReportPayloadLock"
import { useAccountByAddress } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import type { BaseError } from "viem"
import { SignApproveButton } from "../SignApproveButton"
import { SignLedgerEthereum } from "../SignLedgerEthereum"
import { TxSubmitButtonFallback } from "./TxSubmitButtonFallback"
import type { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonEth: FC<TxSubmitButtonProps<"ethereum">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
  onError,
  onPayloadLockChange,
}) => {
  const { t } = useTranslation()
  const reportPayloadLock = useReportPayloadLock(onPayloadLockChange)
  const account = useAccountByAddress(tx.payload.from)
  const queryClient = useQueryClient()

  const handleSubmitError = useCallback(
    async (cause: unknown) => {
      log.error("Failed to submit tx", { cause, tx })
      notify({
        title: `Failed to submit`,
        type: "error",
        subtitle: (cause as BaseError).shortMessage ?? getErrorMessage(cause, t("Unknown error")),
        cause,
      })
      await invalidateNonceQueries(queryClient, {
        address: tx.payload.from,
        networkId: tx.networkId,
      })
      onError?.(cause)
    },
    [onError, queryClient, tx, t]
  )

  const handleLedgerSignature = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      try {
        const serialized = serializeTransactionRequest(tx.payload)
        if (!serialized) throw new Error("Failed to serialize transaction request")

        const hash = await api.ethSendSigned(tx.networkId, serialized, signature, tx.txInfo)

        onSubmit(hash)
      } catch (cause) {
        await handleSubmitError(cause)
      }
    },
    [onSubmit, handleSubmitError, tx]
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
      await handleSubmitError(cause)
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit, handleSubmitError, tx])

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
          onSentToDevice={reportPayloadLock}
        />
      )
  }

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
