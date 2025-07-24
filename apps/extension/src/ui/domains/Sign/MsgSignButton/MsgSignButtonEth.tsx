import { FC } from "react"

import { MsgSignButtonProps } from "./types"

export const MsgSignButtonEth: FC<MsgSignButtonProps<"ethereum">> = () =>
  //   {
  //   tx,
  //   containerId,
  //   label,
  //   className,
  //   onSubmit,
  // }
  {
    throw new Error("Not implemented") // TODO
    // const { t } = useTranslation()
    // const account = useAccountByAddress(tx.payload.from)

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

    // const [isSubmitting, setIsSubmitting] = useState(false)

    // const handleSubmitClick = useCallback(async () => {
    //   setIsSubmitting(true)
    //   try {
    //     const serialized = serializeTransactionRequest(tx.payload)
    //     if (!serialized) throw new Error("Failed to serialize transaction request")

    //     const hash = await api.ethSignAndSend(tx.networkId, serialized, tx.txInfo)

    //     onSubmit(hash)
    //   } catch (cause) {
    //     log.error("Failed to submit tx", { cause, tx })
    //     notify({
    //       title: `Failed to submit`,
    //       type: "error",
    //       subtitle: (cause as BaseError).shortMessage ?? (cause as Error)?.message,
    //     })
    //   } finally {
    //     setIsSubmitting(false)
    //   }
    // }, [onSubmit, tx])

    // if (!isAccountPlatformEthereum(account))
    //   return <MsgSignButtonFallback label={label} className={className} />

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

    // return (
    //   <Button
    //     processing={isSubmitting}
    //     onClick={handleSubmitClick}
    //     className={classNames("w-full", className)}
    //     primary
    //   >
    //     {label ?? t("Approve")}
    //   </Button>
    // )
  }
