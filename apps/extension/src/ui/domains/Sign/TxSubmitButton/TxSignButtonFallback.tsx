import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

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
