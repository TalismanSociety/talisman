import { AlertTriangleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useIsCapsLockOn } from "@ui/hooks/useIsCapsLockOn"
import { FC } from "react"
import { useTranslation } from "react-i18next"

export const CapsLockWarningMessage: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const isCapsLockOn = useIsCapsLockOn()

  if (!isCapsLockOn) return null

  return (
    <span className={classNames("text-alert-warn inline-flex items-center gap-[0.5em]", className)}>
      <AlertTriangleIcon className="text-[1.2em]" />
      <span>{t("Caps Lock is enabled")}</span>
    </span>
  )
}
