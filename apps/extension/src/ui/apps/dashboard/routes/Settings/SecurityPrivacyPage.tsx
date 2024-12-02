import {
  ActivityIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  InfoIcon,
  LockIcon,
  ShieldZapIcon,
} from "@talismn/icons"
import { IS_FIREFOX } from "extension-shared"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { CtaButton, Toggle, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { Spacer } from "@talisman/components/Spacer"
import { useMnemonicBackup } from "@ui/hooks/useMnemonicBackup"
import { useFeatureFlag, useSetting } from "@ui/state"

import { DashboardLayout } from "../../layout"

const Content = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const [useErrorTracking, setUseErrorTracking] = useSetting("useErrorTracking")
  const [autoRiskScan, setAutoRiskScan] = useSetting("autoRiskScan")
  const navigate = useNavigate()

  const withRiskAnalysis = useFeatureFlag("RISK_ANALYSIS")

  const { allBackedUp } = useMnemonicBackup()

  return (
    <>
      <HeaderBlock
        title={t("Security and Privacy")}
        text={t("Control security and privacy preferences")}
      />
      <Spacer large />
      <div className="flex flex-col gap-4">
        <CtaButton
          iconLeft={LockIcon}
          iconRight={ChevronRightIcon}
          title={t("Change password")}
          subtitle={
            allBackedUp
              ? t("Change your Talisman password")
              : t("Please back up your recovery phrase before you change your password.")
          }
          to={`/settings/security-privacy-settings/change-password`}
          disabled={!allBackedUp}
        />
        <CtaButton
          iconLeft={ClockIcon}
          iconRight={ChevronRightIcon}
          title={t("Auto-lock timer")}
          subtitle={t("Set a timer to automatically lock your Talisman wallet")}
          to={`/settings/security-privacy-settings/autolock`}
        />
        {withRiskAnalysis && (
          <Setting
            iconLeft={ShieldZapIcon}
            title={
              <span className="inline-flex items-center gap-[0.3em]">
                <span>{t("Auto risk scan")}</span>
                <Tooltip>
                  <TooltipTrigger className="inline-block">
                    <InfoIcon />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t(
                      "This service is only available for some Ethereum networks, please visit Blowfish website for more information.",
                    )}
                  </TooltipContent>
                </Tooltip>
              </span>
            }
            subtitle={
              <Trans t={t}>
                Automatically assess risks of Ethereum transactions and messages via{" "}
                <a
                  className="text-grey-200 hover:text-body"
                  href="https://blowfish.xyz"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Blowfish
                </a>
              </Trans>
            }
          >
            <Toggle checked={autoRiskScan} onChange={(e) => setAutoRiskScan(e.target.checked)} />
          </Setting>
        )}
        {!IS_FIREFOX && (
          <>
            <Setting
              iconLeft={AlertCircleIcon}
              title={t("Error reporting")}
              subtitle={
                <Trans t={t}>
                  Send anonymised error reports to Talisman (via{" "}
                  <a
                    className="text-grey-200 hover:text-body"
                    href="https://www.sentry.io"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Sentry
                  </a>
                  )
                </Trans>
              }
            >
              <Toggle
                checked={useErrorTracking}
                onChange={(e) => setUseErrorTracking(e.target.checked)}
              />
            </Setting>
            <Setting
              iconLeft={ActivityIcon}
              title={t("Analytics")}
              subtitle={
                <Trans t={t}>
                  Opt in to collection of anonymised usage data.{" "}
                  <button
                    type="button"
                    className="text-grey-200 hover:text-body"
                    onClick={() => navigate("/settings/analytics")}
                  >
                    Learn More
                  </button>
                </Trans>
              }
            >
              <Toggle
                checked={useAnalyticsTracking}
                onChange={(e) => setUseAnalyticsTracking(e.target.checked)}
              />
            </Setting>
          </>
        )}
      </div>
    </>
  )
}

export const SecurityPrivacyPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)
