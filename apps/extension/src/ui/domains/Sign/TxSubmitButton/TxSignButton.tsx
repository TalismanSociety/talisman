import { useRiskAnalysisSubmitGate } from "@ui/domains/Sign/risk-analysis/useRiskAnalysisSubmitGate"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { TxSubmitButtonFallback } from "./TxSignButtonFallback"
import { TxSubmitButtonDot } from "./TxSubmitButtonDot"
import { TxSubmitButtonEth } from "./TxSubmitButtonEth"
import { TxSubmitButtonSol } from "./TxSubmitButtonSol"
import type { TxSubmitButtonProps } from "./types"

export const TxSubmitButton: FC<TxSubmitButtonProps> = ({
  tx,
  containerId,
  label,
  className,
  disabled,
  isProcessing,
  onSubmit,
}) => {
  const { t } = useTranslation()
  const riskGate = useRiskAnalysisSubmitGate()

  if (riskGate.isBlocked)
    return (
      <div className="flex w-full flex-col gap-6">
        <div role="alert" className="text-center text-brand-orange text-xs">
          {riskGate.message}
        </div>
        <TxSubmitButtonFallback
          label={label ?? t("Confirm")}
          disabled
          className={cn("w-full", className)}
        />
      </div>
    )

  if (!tx || disabled || isProcessing)
    return (
      <TxSubmitButtonFallback
        label={label ?? t("Confirm")}
        disabled={disabled}
        isProcessing={isProcessing}
        className={cn("w-full", className)}
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
          className={cn("w-full", className)}
        />
      )
  }
}
