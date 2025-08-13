import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonDot } from "./TxSubmitButtonDot"
import { TxSubmitButtonEth } from "./TxSubmitButtonEth"
import { TxSubmitButtonSol } from "./TxSubmitButtonSol"
import { TxSubmitButtonProps } from "./types"

export const TxSubmitButton: FC<TxSubmitButtonProps> = ({
  tx,
  containerId,
  label,
  className,
  disabled,
  onSubmit,
}) => {
  const { t } = useTranslation()

  if (!tx || disabled)
    return (
      <TxSubmitButtonFallback
        label={label ?? t("Confirm")}
        className={classNames("w-full", className)}
      />
    )

  switch (tx.platform) {
    case "polkadot":
      return (
        <TxSubmitButtonDot
          containerId={containerId}
          label={label}
          tx={tx}
          onSubmit={onSubmit}
          className={className}
        />
      )
    case "ethereum":
      return (
        <TxSubmitButtonEth
          containerId={containerId}
          label={label}
          tx={tx}
          onSubmit={onSubmit}
          className={className}
        />
      )
    case "solana":
      return (
        <TxSubmitButtonSol
          containerId={containerId}
          label={label}
          tx={tx}
          onSubmit={onSubmit}
          className={className}
        />
      )
    default:
      return (
        <TxSubmitButtonFallback
          label="Unsupported transaction type"
          className={classNames("w-full", className)}
        />
      )
  }
}
