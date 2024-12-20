import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { TalismanLedgerError } from "@ui/hooks/ledger/errors"

import { ErrorMessageDrawer } from "./ErrorMessageDrawer"

export const SignLedgerBase: FC<{
  isProcessing: boolean
  error: TalismanLedgerError | null
  containerId?: string
  className?: string
  onSignClick: () => void
  onDismissErrorClick: () => void
  onCancel?: () => void
}> = ({
  isProcessing,
  error,
  containerId,
  className,
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
      <Button primary processing={isProcessing} onClick={onSignClick} className="px-4">
        {t("Approve on Ledger")}
      </Button>
      <ErrorMessageDrawer
        name={error?.name}
        message={error?.message}
        containerId={containerId}
        onDismiss={onDismissErrorClick}
      />
    </div>
  )
}
