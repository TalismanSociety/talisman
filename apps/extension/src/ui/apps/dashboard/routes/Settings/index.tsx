import CtaButton from "@talisman/components/CtaButton"
import Grid from "@talisman/components/Grid"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import {
  ArrowRightIcon,
  ChevronRightIcon,
  GlobeIcon,
  ShieldIcon,
  ToolIcon,
  UsersIcon,
} from "@talisman/theme/icons"
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
import {
  DetailedHTMLProps,
  FC,
  MouseEventHandler,
  ReactNode,
  SVGProps,
  useCallback,
  useEffect,
} from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { classNames } from "talisman-ui"

type SettingButtonProps = DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  icon: FC<SVGProps<SVGSVGElement>>
  title: ReactNode
  subtitle: ReactNode
  to?: string
}

const SettingButton: FC<SettingButtonProps> = ({
  icon: Icon,
  title,
  subtitle,
  className,
  to,
  onClick,
  ...props
}) => {
  const navigate = useNavigate()
  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (to) navigate(to)
      else if (onClick) onClick(e)
    },
    [navigate, onClick, to]
  )

  return (
    <button
      {...props}
      className={classNames(
        "bg-grey-900 enabled:hover:bg-grey-800 text-body-disabled enabled:hover:text-body flex h-40 w-full cursor-pointer items-center gap-8 rounded-sm px-8 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={handleClick}
    >
      <Icon className="text-body text-lg" />
      <div className="flex grow flex-col items-start gap-4">
        <div className="text-body">{title}</div>
        <div className="text-body-secondary text-sm">{subtitle}</div>
      </div>
      <ChevronRightIcon className="text-lg" />
    </button>
  )
}

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
      setSearchParams({})
    }
  }, [openMigratePw, openBackupMnemonic, searchParams, setSearchParams])

  return (
    <Layout centered>
      <h2>Settings</h2>
      <div className="mt-20 space-y-4">
        <SettingButton
          icon={IconKey}
          title="Backup Wallet"
          subtitle="Backup your recovery phrase"
          onClick={openBackupMnemonic}
        />
        <SettingButton
          icon={IconLink}
          title="Trusted Sites"
          subtitle="Manage the sites that have access to your accounts"
          to={`/settings/connected-sites`}
        />
        <SettingButton
          icon={UsersIcon}
          title="Address Book"
          subtitle="Manage your saved contacts"
          to={`/settings/address-book`}
        />
        <SettingButton
          icon={GlobeIcon}
          title="Ethereum Networks"
          subtitle="Manage Ethereum compatible networks"
          to={`/networks`}
        />
        <SettingButton
          icon={IconList}
          title="Ethereum Tokens"
          subtitle="Add or delete custom ERC20 tokens"
          to={`/tokens`}
        />
        <SettingButton
          icon={ToolIcon}
          title="Extension Options"
          subtitle="Customise your extension experience"
          to={`/settings/options`}
        />
        <SettingButton
          icon={ShieldIcon}
          title="Security and Privacy"
          subtitle="Control security and privacy preferences"
          to={`/settings/security-privacy-settings`}
        />
        <SettingButton
          icon={IconLock}
          title="Change password"
          subtitle={
            isNotConfirmed
              ? "Please back up your recovery phrase before you change your password."
              : "Change your Talisman password"
          }
          to={`/settings/change-password`}
          disabled={isNotConfirmed}
        />
        <SettingButton
          icon={IconClock}
          title="Auto-lock Timer"
          subtitle="Set a timer to automatically lock the Talisman extension"
          to={`/settings/autolock`}
        />
        <SettingButton
          icon={IconInfo}
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
