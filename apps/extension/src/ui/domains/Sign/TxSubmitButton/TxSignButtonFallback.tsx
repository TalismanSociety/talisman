import { classNames } from "@talismn/util"
import { Button } from "@ui/talisman-ui"
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
      className={classNames("w-full", className)}
      primary
      disabled={disabled && !isProcessing}
      processing={isProcessing}
    >
      {label ?? t("Confirm")}
    </Button>
  )
}
