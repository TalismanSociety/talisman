import { Nav } from "@talisman/components/Nav"
import {
  GlobeIcon,
  LinkIcon,
  ShieldIcon,
  SlidersIcon,
  TalismanHandIcon,
  UserIcon,
  UsersIcon,
} from "@talismn/icons"
import { useTranslation } from "react-i18next"

import { SidebarNavItem } from "./SidebarNavItem"

export const SettingsSidebar = () => {
  const { t } = useTranslation()

  return (
    <Nav className="gap-2 p-4 text-sm lg:p-12 lg:text-base">
      <SidebarNavItem title={t("General")} to="/settings/general" icon={<SlidersIcon />} />
      <SidebarNavItem title={t("Accounts")} to="/settings/accounts" icon={<UserIcon />} />
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
