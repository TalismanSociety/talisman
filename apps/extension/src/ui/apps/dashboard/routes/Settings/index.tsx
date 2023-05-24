import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ChevronRightIcon, GlobeIcon, ShieldIcon, ToolIcon, UsersIcon } from "@talisman/theme/icons"
import { ReactComponent as IconClock } from "@talisman/theme/icons/clock.svg"
import { ReactComponent as IconInfo } from "@talisman/theme/icons/info.svg"
import { ReactComponent as IconKey } from "@talisman/theme/icons/key.svg"
import { ReactComponent as IconLink } from "@talisman/theme/icons/link.svg"
import { ReactComponent as IconList } from "@talisman/theme/icons/list.svg"
import { ReactComponent as IconLock } from "@talisman/theme/icons/lock.svg"
import Layout from "@ui/apps/dashboard/layout"
import { MigratePasswordModal } from "@ui/domains/Settings/MigratePassword/MigratePasswordModal"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { CtaButton } from "talisman-ui"

const Settings = () => {
  const { isOpen: isOpenMigratePw, open: openMigratePw, close: closeMigratePw } = useOpenClose()
  const {
    isOpen: isOpenBackupMnemonic,
    open: openBackupMnemonic,
    close: closeBackupMnemonic,
  } = useOpenClose()
  const { isNotConfirmed } = useMnemonicBackup()

  // auto open backup popup if requested in query string
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

  return (
    <Layout centered>
      <h2>Settings</h2>
      <div className="mt-20 space-y-4">
        <CtaButton
          iconLeft={IconKey}
          iconRight={ChevronRightIcon}
          title="Backup Wallet"
          subtitle="Backup your recovery phrase"
          onClick={openBackupMnemonic}
        />
        <CtaButton
          iconLeft={IconLink}
          iconRight={ChevronRightIcon}
          title="Trusted Sites"
          subtitle="Manage the sites that have access to your accounts"
          to={`/settings/connected-sites`}
        />
        <CtaButton
          iconLeft={UsersIcon}
          iconRight={ChevronRightIcon}
          title="Address Book"
          subtitle="Manage your saved contacts"
          to={`/settings/address-book`}
        />
        <CtaButton
          iconLeft={GlobeIcon}
          iconRight={ChevronRightIcon}
          title="Ethereum Networks"
          subtitle="Manage Ethereum compatible networks"
          to={`/networks`}
        />
        <CtaButton
          iconLeft={IconList}
          iconRight={ChevronRightIcon}
          title="Ethereum Tokens"
          subtitle="Add or delete custom ERC20 tokens"
          to={`/tokens`}
        />
        <CtaButton
          iconLeft={ToolIcon}
          iconRight={ChevronRightIcon}
          title="Extension Options"
          subtitle="Customise your extension experience"
          to={`/settings/options`}
        />
        <CtaButton
          iconLeft={ShieldIcon}
          iconRight={ChevronRightIcon}
          title="Security and Privacy"
          subtitle="Control security and privacy preferences"
          to={`/settings/security-privacy-settings`}
        />
        <CtaButton
          iconLeft={IconLock}
          iconRight={ChevronRightIcon}
          title="Change password"
          subtitle={
            isNotConfirmed
              ? "Please back up your recovery phrase before you change your password."
              : "Change your Talisman password"
          }
          to={`/settings/change-password`}
          disabled={isNotConfirmed}
        />
        <CtaButton
          iconLeft={IconClock}
          iconRight={ChevronRightIcon}
          title="Auto-lock Timer"
          subtitle="Set a timer to automatically lock the Talisman extension"
          to={`/settings/autolock`}
        />
        <CtaButton
          iconLeft={IconInfo}
          iconRight={ChevronRightIcon}
          title="About"
          subtitle="Read our Privacy Policy and Terms of Use"
          to={`/settings/about`}
        />
      </div>
      <MnemonicModal open={isOpenBackupMnemonic} onClose={closeBackupMnemonic} />
      <MigratePasswordModal open={isOpenMigratePw} onClose={closeMigratePw} />
    </Layout>
  )
}

export default Settings
