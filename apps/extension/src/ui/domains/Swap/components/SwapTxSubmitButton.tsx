import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSubmitButton"
import type { TxSubmitButtonProps } from "@ui/domains/Sign/TxSubmitButton/types"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

const RETRY_CLASS_NAME =
  "bg-orange-500 enabled:hover:bg-orange/90 enabled:hover:active:bg-orange disabled:bg-orange-500/50"

export const SwapTxSubmitButton: FC<TxSubmitButtonProps & { isRetry?: boolean }> = ({
  isRetry,
  label,
  className,
  ...props
}) => {
  const { t } = useTranslation()

  return (
    <TxSubmitButton
      {...props}
      label={isRetry ? t("Try again") : label}
      className={cn(isRetry && RETRY_CLASS_NAME, className)}
    />
  )
}
