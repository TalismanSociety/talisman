import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Setting } from "@talisman/components/Setting"
import { Spacer } from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  ActivityIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  KeyIcon,
  LockIcon,
} from "@talismn/icons"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useEffect } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CtaButton, Toggle } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

export const SecurityPrivacyPage = () => {
  const { t } = useTranslation("admin")
  const [useAnalyticsTracking, setUseAnalyticsTracking] = useSetting("useAnalyticsTracking")
  const [useErrorTracking, setUseErrorTracking] = useSetting("useErrorTracking")
  const navigate = useNavigate()

  const { isNotConfirmed } = useMnemonicBackup()

  const {
    isOpen: isOpenBackupMnemonic,
    open: openBackupMnemonic,
    close: closeBackupMnemonic,
  } = useShowBackupModal()
  const { isOpen: isOpenMigratePw, close: closeMigratePw } = useShowMigratePwModal()

  return (
    <DashboardLayout centered>
      <HeaderBlock
        title={t("Security and Privacy")}
        text={t("Control security and privacy preferences")}
      />
      <Spacer large />
      <div className="flex flex-col gap-4">
        <CtaButton
          iconLeft={KeyIcon}
          iconRight={ChevronRightIcon}
          title={t("Backup Wallet")}
          subtitle={t("Backup your recovery phrase")}
          onClick={openBackupMnemonic}
        />
        <CtaButton
          iconLeft={LockIcon}
          iconRight={ChevronRightIcon}
          title={t("Change password")}
          subtitle={
            isNotConfirmed
              ? t("Please back up your recovery phrase before you change your password.")
              : t("Change your Talisman password")
          }
          to={`/settings/change-password`}
          disabled={isNotConfirmed}
        />
        <CtaButton
          iconLeft={ClockIcon}
          iconRight={ChevronRightIcon}
          title={t("Auto-lock Timer")}
          subtitle={t("Set a timer to automatically lock your Talisman wallet")}
          to={`/settings/autolock`}
        />
        {useErrorTracking !== undefined && (
          <Setting
            iconLeft={AlertCircleIcon}
            title={t("Error Reporting")}
            subtitle={
              <Trans t={t}>
                Send anonymised error reports to Talisman (via{" "}
                <a
                  className="text-grey-200 hover:text-body"
                  href="https://www.sentry.io"
                  target="_blank"
                  rel="noreferrer"
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
      <MnemonicModal open={isOpenBackupMnemonic} onClose={closeBackupMnemonic} />
      <MigratePasswordModal open={isOpenMigratePw} onClose={closeMigratePw} />
    </DashboardLayout>
  )
}

const useShowBackupModal = () => {
  const { isOpen, open, close: closeModal } = useOpenClose()
  const [searchParams, setSearchParams] = useSearchParams()

  // auto open modal if requested in query string
  useEffect(() => {
    if (searchParams.get("showBackupModal") === null) return
    open()
  }, [open, searchParams])

  // when closing modal, remove the query param so the warning modal displays again
  const close = useCallback(() => {
    closeModal()
    setSearchParams((prev) => {
      prev.delete("showBackupModal")
      return prev
    })
  }, [closeModal, setSearchParams])

  return { isOpen, open, close }
}

const useShowMigratePwModal = () => {
  const { isOpen, open, close } = useOpenClose()
  const [searchParams, setSearchParams] = useSearchParams()

  // auto open modal if requested in query string
  useEffect(() => {
    if (searchParams.get("showMigratePasswordModal") === null) return
    open()
    setSearchParams({})
  }, [open, searchParams, setSearchParams])

  return { isOpen, open, close }
}
