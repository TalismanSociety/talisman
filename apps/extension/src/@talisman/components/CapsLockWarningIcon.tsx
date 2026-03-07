import { CapsLockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useIsCapsLockOn } from "@ui/hooks/useIsCapsLockOn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const CapsLockWarningIcon: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const isCapsLockOn = useIsCapsLockOn()

  if (!isCapsLockOn) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={classNames("text-alert-warn", className)}>
          <CapsLockIcon className="text-lg" />
        </div>
      </TooltipTrigger>
      <TooltipContent>{t("Caps Lock is enabled")}</TooltipContent>
    </Tooltip>
  )
}
