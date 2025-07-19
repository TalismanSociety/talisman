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

import { TxSignButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonSol: FC<TxSubmitButtonProps<"solana">> = ({
  tx,
  // containerId,
  label,
  className,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const address = useMemo(() => tx.payload.feePayer?.toBase58(), [tx.payload])
  const account = useAccountByAddress(address)

  // const handleLedgerSignature = useCallback(
  //   async ({ signature }: { signature: `0x${string}` }) => {
  //     try {
  //       const serialized = serializeTransactionRequest(tx.payload)
  //       if (!serialized) throw new Error("Failed to serialize transaction request")

  //       const hash = await api.ethSendSigned(tx.networkId, serialized, signature, tx.txInfo)

  //       onSubmit(hash)
  //     } catch (cause) {
  //       log.error("Failed to submit tx", { cause, tx })
  //       notify({
  //         title: `Failed to submit`,
  //         type: "error",
  //         subtitle: (cause as BaseError).shortMessage ?? (cause as Error)?.message,
  //       })
  //     }
  //   },
  //   [onSubmit, tx],
  // )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitClick = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const serialized = solTransactionToJson(tx.payload)
      if (!serialized) throw new Error("Failed to serialize transaction request")

      const { signature } = await api.solSubmit(tx.networkId, serialized, undefined, tx.txInfo)

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

  if (!isAccountPlatformSolana(account) || !isAccountOwned(account))
    return <TxSignButtonFallback label={label} className={className} />

  // switch (account.type) {
  //   case "ledger-ethereum":
  //     return (
  //       <SignLedgerEthereum
  //         account={account}
  //         method="eth_sendTransaction"
  //         payload={tx.payload}
  //         className={className}
  //         containerId={containerId}
  //         evmNetworkId={tx.networkId}
  //         onSigned={handleLedgerSignature}
  //       />
  //     )
  // }

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
