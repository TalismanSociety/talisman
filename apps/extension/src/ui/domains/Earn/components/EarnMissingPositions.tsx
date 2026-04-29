import { TALISMAN_WEB_APP_URL } from "@common/constants"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const EarnMissingPositions: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()

  return (
    <div className={className}>
      <span className="mr-2 text-body-inactive">{t("Missing Substrate staking positions?")}</span>
      <button
        type="button"
        className="inline-block text-left text-body-inactive hover:text-body-secondary"
        onClick={() => window.open(TALISMAN_WEB_APP_URL, "_blank", "noopener,noreferrer")}
      >
        {t("Browse our legacy staking portal")}
      </button>
    </div>
  )
}
