import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import type { FC } from "react"

import type { TxSubmitButtonProps } from "./types"

export const TxSubmitButtonDot: FC<TxSubmitButtonProps<"polkadot">> = ({
  tx,
  containerId,
  label,
  className,
  onSubmit,
  onError,
  onPayloadLockChange,
}) => (
  <SapiSendButton
    containerId={containerId}
    label={label}
    onSubmitted={onSubmit}
    onError={onError}
    onPayloadLockChange={onPayloadLockChange}
    payload={tx.payload}
    txInfo={tx.txInfo}
    txMetadata={tx.txMetadata}
    className={className}
  />
)
