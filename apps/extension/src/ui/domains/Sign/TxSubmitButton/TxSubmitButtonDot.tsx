import { FC } from "react"

import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"

import { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonDot: FC<TxSubmitButtonProps<"polkadot">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
}) => (
  <SapiSendButton
    containerId={containerId}
    label={label}
    onSubmitted={onSubmit}
    payload={tx.payload}
    txInfo={tx.txInfo}
    txMetadata={tx.txMetadata}
    className={className}
  />
)
