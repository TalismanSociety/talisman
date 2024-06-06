import { Nav } from "@talisman/components/Nav"
import {
  AlertCircleIcon,
  GlobeIcon,
  LinkIcon,
  SecretIcon,
  ShieldIcon,
  SlidersIcon,
  TalismanHandIcon,
  UserIcon,
  UsersIcon,
} from "@talismn/icons"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { SidebarNavItem } from "./SidebarNavItem"

const MnemonicNotification = () => {
  const { allBackedUp } = useMnemonicBackup()

  return !allBackedUp ? <AlertCircleIcon className="text-alert-warn" /> : null
}

export const SettingsSidebar = () => {
  const { t } = useTranslation()

  return (
    <Nav className="gap-1 p-4 text-sm lg:px-12 lg:pb-12 lg:pt-6 lg:text-base">
      <SidebarNavItem title={t("General")} to="/settings/general" icon={<SlidersIcon />} />
      <SidebarNavItem title={t("Accounts")} to="/settings/accounts" icon={<UserIcon />} />
      <SidebarNavItem
        title={
          <span className="flex items-center gap-2">
            {t("Recovery Phrases")}
            <Suspense>
              <MnemonicNotification />
            </Suspense>
          </span>
        }
        to="/settings/mnemonics"
        icon={<SecretIcon />}
      />
      <SidebarNavItem title={t("Address Book")} to="/settings/address-book" icon={<UsersIcon />} />
      <SidebarNavItem
        title={t("Connected Sites")}
        to="/settings/connected-sites"
        icon={<LinkIcon />}
      />
      <SidebarNavItem
        title={t("Security & Privacy")}
        to="/settings/security-privacy-settings"
        icon={<ShieldIcon />}
      />
      <SidebarNavItem
        title={t("Networks & Tokens")}
        to="/settings/networks-tokens"
        icon={<GlobeIcon />}
      />
      <SidebarNavItem title={t("About")} to="/settings/about" icon={<TalismanHandIcon />} />
    </Nav>
  )
}
