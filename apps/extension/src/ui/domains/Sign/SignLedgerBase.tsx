import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { TalismanLedgerError } from "@ui/hooks/ledger/errors"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"
import { SignApproveButton } from "./SignApproveButton"

export const SignLedgerBase: FC<{
  isProcessing: boolean
  error: TalismanLedgerError | null
  containerId?: string
  className?: string
  disabled?: boolean
  onSignClick: () => void
  onDismissErrorClick: () => void
  onCancel?: () => void
}> = ({
  isProcessing,
  error,
  containerId,
  className,
  disabled,
  onSignClick,
  onDismissErrorClick,
  onCancel,
}) => {
  const { t } = useTranslation()

  return (
    <div
      className={classNames(
        "grid w-full gap-8",
        onCancel ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {!!onCancel && <Button onClick={onCancel}>{t("Cancel")}</Button>}
      <SignApproveButton
        primary
        processing={isProcessing}
        disabled={disabled}
        onClick={onSignClick}
        className="px-4"
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
