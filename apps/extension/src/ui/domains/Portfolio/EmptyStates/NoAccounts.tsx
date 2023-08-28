import { EyePlusIcon, PlusIcon } from "@talisman/theme/icons"
import imgNoAccounts from "@talisman/theme/images/no-accounts-character.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 1,
  page: "Dashboard - No Accounts",
}

export const NoAccounts = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const handleAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "add account",
    })
    navigate("/accounts/add")
  }, [navigate])

  const handleWatchAccountClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "watch account",
    })
    navigate("/accounts/add/watched")
  }, [navigate])

  return (
    <div className="flex w-1/2 flex-col items-center justify-center gap-12 p-12 text-center">
      <span className="text-lg">{t("Talisman awaits!")}</span>
      <img className="h-[21.4rem] w-[26rem]" src={imgNoAccounts} alt="Heroic Character" />
      <div className="text-body-secondary">
        <Trans t={t}>
          <span className="text-body">Add an account</span> or{" "}
          <span className="text-body">watch</span> those who are already walking the paths of the
          Paraverse.
        </Trans>
      </div>
      <div className="flex w-[28rem] flex-col items-center gap-8">
        <Button primary fullWidth iconLeft={PlusIcon} onClick={handleAddAccountClick}>
          {t("Add account")}
        </Button>
        <button
          className="hover:text-body-secondary text-body flex items-center gap-4"
          onClick={handleWatchAccountClick}
        >
          <EyePlusIcon />
          <span>{t("Watch account")}</span>
        </button>
      </div>
    </div>
  )
}
