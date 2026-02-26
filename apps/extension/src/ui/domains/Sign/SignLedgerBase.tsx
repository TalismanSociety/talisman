import { classNames, cn } from "@talismn/util"
import type { TalismanLedgerError } from "@ui/hooks/ledger/errors"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, type ButtonProps } from "talisman-ui"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignApproveButton } from "./SignApproveButton"

export const SignLedgerBase: FC<{
  isProcessing: boolean
  error: TalismanLedgerError | null
  containerId?: string
  className?: string
  disabled?: boolean
  color?: ButtonProps["color"]
  onSignClick: () => void
  onDismissErrorClick: () => void
  onCancel?: () => void
}> = ({
  isProcessing,
  error,
  containerId,
  className,
  disabled,
  color,
  onSignClick,
  onDismissErrorClick,
  onCancel,
}) => {
  const { t } = useTranslation()

  return (
    <div className={classNames("grid w-full gap-8", onCancel ? "grid-cols-2" : "grid-cols-1")}>
      {!!onCancel && <Button onClick={onCancel}>{t("Cancel")}</Button>}
      <SignApproveButton
        primary
        color={color}
        processing={isProcessing}
        disabled={disabled}
        onClick={onSignClick}
        className={cn("px-4", className)}
      >
        {t("Sign on Ledger")}
      </SignApproveButton>
      <ErrorMessageDrawer
        name={error?.name}
        message={error?.message}
        containerId={containerId}
        onDismiss={onDismissErrorClick}
      />
    </div>
  )
}
