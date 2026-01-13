import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import type { FC } from "react"

import type { TxSubmitButtonProps } from "./types"

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
