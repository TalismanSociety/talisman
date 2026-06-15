import { TALISMAN_WEB_APP_URL } from "@common/constants"
import { InfoIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

export const EarnMissingPositions: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()

  return (
    <div className={cn("text-body-inactive", className)}>
      <Trans t={t}>
        Missing Substrate staking positions? Browse our <PortalLink />
      </Trans>

      <Tooltip>
        <TooltipTrigger>
          <InfoIcon className="ml-2 inline-block text-body-inactive" />
        </TooltipTrigger>
        <TooltipContent>
          {t("DOT and KSM staking positions can be found in your portfolio directly")}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

const PortalLink = () => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className="inline-block text-left text-body-inactive underline hover:text-body-secondary"
      onClick={() => window.open(TALISMAN_WEB_APP_URL, "_blank", "noopener,noreferrer")}
    >
      {t("legacy staking portal")}
    </button>
  )
}
