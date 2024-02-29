import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { Spacer } from "@talisman/components/Spacer"
import {
  ActivityIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  LockIcon,
} from "@talismn/icons"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSetting } from "@ui/hooks/useSettings"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { CtaButton, Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const SecurityPrivacyPage = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const [useErrorTracking, setUseErrorTracking] = useSetting("useErrorTracking")
  const navigate = useNavigate()

  const { allBackedUp } = useMnemonicBackup()

  return (
    <DashboardLayout centered>
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
        {useErrorTracking !== undefined && (
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
        )}
        {useAnalyticsTracking !== undefined && (
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
        )}
      </div>
    </DashboardLayout>
  )
}
