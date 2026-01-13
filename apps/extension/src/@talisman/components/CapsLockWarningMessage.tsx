import { AlertTriangleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useIsCapsLockOn } from "@ui/hooks/useIsCapsLockOn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const CapsLockWarningMessage: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const isCapsLockOn = useIsCapsLockOn()

  if (!isCapsLockOn) return null

  return (
    <span className={classNames("inline-flex items-center gap-[0.5em] text-alert-warn", className)}>
      <AlertTriangleIcon className="text-[1.2em]" />
      <span>{t("Caps Lock is enabled")}</span>
    </span>
  )
}
