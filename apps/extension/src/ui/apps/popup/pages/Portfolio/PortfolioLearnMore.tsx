import { FadeIn } from "@talisman/components/FadeIn"
import { ArrowUpRightIcon, ChevronLeftIcon, ExternalLinkIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { MouseEventHandler, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import AdvancedAccountManagementUrl from "./assets/Learn More - Advanced Account Management.png"
import MakeItYoursUrl from "./assets/Learn More - Make it Yours.png"
import SafeguardYourAssetsUrl from "./assets/Learn More - Safeguard Your Assets.png"
import SeamlessUserExperienceUrl from "./assets/Learn More - Seamless User Experience.png"
import WorksWithExternalDevicesUrl from "./assets/Learn More - Works with External Devices.png"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Learn More",
}

const newGoToFn = (analyticsAction: string, dashboardPath: string) => () => {
  sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: analyticsAction })
  return api.dashboardOpen(dashboardPath)
}
const goToSettingsAccounts = newGoToFn("Manage accounts", "/settings/accounts")
const goToSettingsCurrency = newGoToFn("Change currencies", "/settings/general/currency")
const goToAddHardwareAccounts = newGoToFn(
  "Add hardware accounts",
  "/accounts/add?methodType=connect"
)
const goToSettingsMnemonics = newGoToFn("Manage mnemonics", "/settings/mnemonics")

export const PortfolioLearnMore = () => {
  const { t } = useTranslation()

  return (
    <FadeIn className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
      <LearnMoreSection
        title={t("Make it Yours")}
        subtitle={t("Sort and organize accounts into folders")}
        button={<LearnMoreButton onClick={goToSettingsAccounts} />}
      >
        <img
          className="bg-body-black aspect-[318/156] w-full rounded"
          alt="demo screenshot"
          src={MakeItYoursUrl}
        />
      </LearnMoreSection>

      <LearnMoreSection
        title={t("Seamless User Experience")}
        subtitle={t("Switch currencies with just one click")}
        button={<LearnMoreButton onClick={goToSettingsCurrency} />}
      >
        <img
          className="bg-body-black aspect-[318/156] w-full rounded"
          alt="demo screenshot"
          src={SeamlessUserExperienceUrl}
        />
      </LearnMoreSection>

      <LearnMoreSection
        title={t("Works with External Devices")}
        subtitle={t("Import your favorite hardware device")}
        button={<LearnMoreButton onClick={goToAddHardwareAccounts} />}
      >
        <img
          className="bg-body-black aspect-[318/156] w-full rounded"
          alt="demo screenshot"
          src={WorksWithExternalDevicesUrl}
        />
      </LearnMoreSection>

      <LearnMoreSection
        title={t("Advanced Account Management")}
        subtitle={t("Create and manage multiple mnemonics")}
        button={<LearnMoreButton onClick={goToSettingsMnemonics} />}
      >
        <img
          className="bg-body-black aspect-[318/156] w-full rounded"
          alt="demo screenshot"
          src={AdvancedAccountManagementUrl}
        />
      </LearnMoreSection>

      <LearnMoreSection
        title={t("Safeguard Your Assets")}
        subtitle={t("Non-custodial, fully audited and open-source")}
        button={
          <LearnMoreButton
            text={t("Learn")}
            icon={ExternalLinkIcon}
            href="https://www.talisman.xyz/security"
          />
        }
      >
        <img
          className="bg-body-black aspect-[318/156] w-full rounded"
          alt="demo screenshot"
          src={SafeguardYourAssetsUrl}
        />
      </LearnMoreSection>
    </FadeIn>
  )
}

const LearnMoreSection = ({
  title,
  subtitle,
  button,
  children,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  button?: ReactNode
  children?: ReactNode
}) => (
  <div className="bg-grey-800 flex w-full flex-col items-center gap-8 rounded p-8">
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <div className="font-bold text-white">{title}</div>
        <div className="text-body-secondary text-xs">{subtitle}</div>
      </div>
      {button}
    </div>

    {children}
  </div>
)

const LearnMoreButton = ({
  text,
  icon,
  href,
  onClick,
}: {
  text?: string
  icon?: typeof ArrowUpRightIcon
  href?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
}) => {
  const { t } = useTranslation()

  const className =
    "bg-primary hover:bg-primary/75 focus:bg-primary/75 text-black-primary text-tiny flex items-center gap-1 whitespace-nowrap rounded-sm px-3 py-4"

  const Icon = icon ?? ArrowUpRightIcon
  const content = (
    <>
      <span>{text ?? t("Try now")}</span>
      <Icon className="text-sm" />
    </>
  )

  if (href !== undefined)
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer noopener">
        {content}
      </a>
    )

  return (
    <button className={className} type="button" onClick={onClick}>
      {content}
    </button>
  )
}

export const PortfolioLearnMoreHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
      <div className="flex-1">
        <button type="button" className="p-6" onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </button>
      </div>
      <div className="font-bold">{t("Learn More")}</div>
      <div className="flex-1 text-right">
        <span />
      </div>
    </header>
  )
}
