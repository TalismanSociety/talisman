import { FC } from "react"
import { useTranslation } from "react-i18next"

export const EarnDiscoverTab: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="text-body-secondary mb-2 text-lg">{t("Discover Tab")}</div>
        <div className="text-body-secondary text-sm">
          {t("Coming soon - discover new earning opportunities")}
        </div>
      </div>
    </div>
  )
}
