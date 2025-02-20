import { ArrowUpRightIcon, ExternalLinkIcon } from "@talismn/icons"
import { FC, MouseEventHandler, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { FadeIn } from "@talisman/components/FadeIn"

import AdvancedAccountManagementUrl from "./assets/Learn More - Advanced Account Management.png"
import MakeItYoursUrl from "./assets/Learn More - Make it Yours.png"
import SafeguardYourAssetsUrl from "./assets/Learn More - Safeguard Your Assets.png"
import SeamlessUserExperienceUrl from "./assets/Learn More - Seamless User Experience.png"
import WorksWithExternalDevicesUrl from "./assets/Learn More - Works with External Devices.png"

export const LearnMoreContent: FC<{
  onManageAccountsClick: () => void
  onCurrenciesClick: () => void
  onAddHardwareClick: () => void
  onMnemonicsClick: () => void
}> = ({ onManageAccountsClick, onAddHardwareClick, onMnemonicsClick, onCurrenciesClick }) => {
  const { t } = useTranslation()

  return (
    <FadeIn className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
      <LearnMoreSection
        title={t("Make it Yours")}
        subtitle={t("Sort and organize accounts into folders")}
        button={<LearnMoreButton onClick={onManageAccountsClick} />}
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
        button={<LearnMoreButton onClick={onCurrenciesClick} />}
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
        button={<LearnMoreButton onClick={onAddHardwareClick} />}
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
        button={<LearnMoreButton onClick={onMnemonicsClick} />}
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

  if (href !== undefined)
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer noopener">
        <span>{text ?? t("Try now")}</span>
        <Icon className="text-sm" />
      </a>
    )

  return (
    <button className={className} type="button" onClick={onClick}>
      <span>{text ?? t("Try now")}</span>
      <Icon className="text-sm" />
    </button>
  )
}
