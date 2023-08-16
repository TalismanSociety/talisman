import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  ChevronRightIcon,
  FlagIcon,
  GlobeIcon,
  ShieldIcon,
  ToolIcon,
  UsersIcon,
} from "@talisman/theme/icons"
import { ReactComponent as IconClock } from "@talisman/theme/icons/clock.svg"
import { ReactComponent as IconKey } from "@talisman/theme/icons/key.svg"
import { ReactComponent as IconLink } from "@talisman/theme/icons/link.svg"
import { ReactComponent as IconList } from "@talisman/theme/icons/list.svg"
import { ReactComponent as IconLock } from "@talisman/theme/icons/lock.svg"
import { ReactComponent as IconTalisman } from "@talisman/theme/icons/talisman-hand.svg"
import { ReactComponent as IconUser } from "@talisman/theme/icons/user.svg"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useSeedPhrases } from "@ui/hooks/useSeedPhrases"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { CtaButton } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const useShowBackupModal = () => {
  const { isOpen, open, close: closeBackupModal } = useOpenClose()
  const [, setSearchParams] = useSearchParams()

  // when closing modal, remove the query param so the warning modal displays again
  const close = useCallback(() => {
    closeBackupModal()
    setSearchParams((prev) => {
      prev.delete("showBackupModal")
      return prev
    })
  }, [closeBackupModal, setSearchParams])

  return { isOpen, open, close }
}

export const SettingsPage = () => {
  const { isOpen: isOpenMigratePw, open: openMigratePw, close: closeMigratePw } = useOpenClose()
  // todo need a way to choose mnemonic Id, for now just use the first
  const mnemonics = useSeedPhrases()
  const firstMnemonicId = Object.keys(mnemonics)[0]

  const {
    isOpen: isOpenBackupMnemonic,
    open: openBackupMnemonic,
    close: closeBackupMnemonic,
  } = useShowBackupModal()
  const { allBackedUp } = useMnemonicBackup()
  const i18nEnabled = useIsFeatureEnabled("I18N")

  // auto open modal if requested in query string
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get("showMigratePasswordModal") !== null) {
      // migrating the password requires confirming backup of the seed, so this modal has priority
      openMigratePw()
      setSearchParams({})
    } else if (searchParams.get("showBackupModal") !== null) {
      openBackupMnemonic()
    }
  }, [openMigratePw, openBackupMnemonic, searchParams, setSearchParams])

  const { t } = useTranslation("admin")

  return (
    <DashboardLayout centered>
      <h2>{t("Settings")}</h2>
      <div className="mt-20 space-y-4">
        <CtaButton
          iconLeft={IconKey}
          iconRight={ChevronRightIcon}
          title={t("Backup Wallet")}
          subtitle={t("Backup your recovery phrase")}
          onClick={openBackupMnemonic}
        />
        <CtaButton
          iconLeft={IconLink}
          iconRight={ChevronRightIcon}
          title={t("Trusted Sites")}
          subtitle={t("Manage the sites that have access to your accounts")}
          to={`/settings/connected-sites`}
        />
        <CtaButton
          iconLeft={UsersIcon}
          iconRight={ChevronRightIcon}
          title={t("Address Book")}
          subtitle={t("Manage your saved contacts")}
          to={`/settings/address-book`}
        />
        <CtaButton
          iconLeft={ToolIcon}
          iconRight={ChevronRightIcon}
          title={t("Extension Options")}
          subtitle={t("Customise your extension experience")}
          to={`/settings/options`}
        />
        <CtaButton
          iconLeft={IconUser}
          iconRight={ChevronRightIcon}
          title={t("Manage Accounts")}
          subtitle={t("Sort and organise your accounts")}
          to={`/settings/accounts`}
        />
        <CtaButton
          iconLeft={GlobeIcon}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum Networks")}
          subtitle={t("Manage Ethereum compatible networks")}
          to={`/networks`}
        />
        <CtaButton
          iconLeft={IconList}
          iconRight={ChevronRightIcon}
          title={t("Manage Ethereum Tokens")}
          subtitle={t("Add or delete custom ERC20 tokens")}
          to={`/tokens`}
        />
        {i18nEnabled && (
          <CtaButton
            iconLeft={FlagIcon}
            iconRight={ChevronRightIcon}
            title={t("Language")}
            subtitle={t("Change the wallet display language")}
            to={`/settings/language`}
          />
        )}
        <CtaButton
          iconLeft={ShieldIcon}
          iconRight={ChevronRightIcon}
          title={t("Security and Privacy")}
          subtitle={t("Control security and privacy preferences")}
          to={`/settings/security-privacy-settings`}
        />
        <CtaButton
          iconLeft={IconLock}
          iconRight={ChevronRightIcon}
          title={t("Change password")}
          subtitle={
            allBackedUp
              ? t("Change your Talisman password")
              : t("Please back up your recovery phrase before you change your password.")
          }
          to={`/settings/change-password`}
          disabled={!allBackedUp}
        />
        <CtaButton
          iconLeft={IconClock}
          iconRight={ChevronRightIcon}
          title={t("Auto-lock Timer")}
          subtitle={t("Set a timer to automatically lock your Talisman wallet")}
          to={`/settings/autolock`}
        />
        <CtaButton
          iconLeft={IconTalisman}
          iconRight={ChevronRightIcon}
          title={t("About")}
          subtitle={t("Read our Privacy Policy and Terms of Use")}
          to={`/settings/about`}
        />
      </div>
      <MnemonicModal
        mnemonicId={firstMnemonicId}
        open={isOpenBackupMnemonic}
        onClose={closeBackupMnemonic}
      />
      <MigratePasswordModal open={isOpenMigratePw} onClose={closeMigratePw} />
    </DashboardLayout>
  )
}
