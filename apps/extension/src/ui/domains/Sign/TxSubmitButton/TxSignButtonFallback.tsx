import { Button } from "@ui/components/Button"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const TxSubmitButtonFallback: FC<{
  label?: string
  className?: string
  disabled?: boolean
  isProcessing?: boolean
}> = ({ label, className, disabled, isProcessing }) => {
  const { t } = useTranslation()

  return (
    <Button
      className={cn("w-full", className)}
      primary
      disabled={disabled && !isProcessing}
      processing={isProcessing}
    >
      {label ?? t("Confirm")}
    </Button>
  )
}
