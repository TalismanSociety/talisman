import {
  GlobeIcon,
  LinkIcon,
  PlusIcon,
  SecretIcon,
  ShieldIcon,
  SlidersIcon,
  TalismanHandIcon,
  UserIcon,
  UsersIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, To } from "react-router-dom"

export const DashboardSettingsSidebar = () => {
  const { t } = useTranslation()

  return (
    <div className={classNames("bg-grey-900 rounded-lg", "flex w-full flex-col gap-8 p-8")}>
      <div className="flex h-16 shrink-0 items-center">
        <div className="grow pl-4 text-[2rem] font-bold">{t("Settings")}</div>
      </div>
      <div className="bg-grey-800 h-0.5"></div>

      <div className="flex w-full flex-col gap-2">
        <SidebarNavItem
          to="/accounts/add"
          label={t("Add Account")}
          icon={
            <div className="bg-primary/10 flex size-12 flex-col items-center justify-center rounded-full">
              <PlusIcon className="text-base" />
            </div>
          }
          className="!text-primary font-bold"
        />
        <SidebarNavItem to="/settings/general" label={t("General")} icon={<SlidersIcon />} />
        <SidebarNavItem
          to="/settings/address-book"
          label={t("Address Book")}
          icon={<UsersIcon />}
        />
        <SidebarNavItem
          label={t("Connected Sites")}
          to="/settings/connected-sites"
          icon={<LinkIcon />}
        />
        <SidebarNavItem label={t("Accounts")} to="/settings/accounts" icon={<UserIcon />} />
        <SidebarNavItem
          label={t("Recovery Phrases")}
          to="/settings/mnemonics"
          icon={<SecretIcon />}
        />
        <SidebarNavItem
          label={t("Security & Privacy")}
          to="/settings/security-privacy-settings"
          icon={<ShieldIcon />}
        />
        <SidebarNavItem
          label={t("Networks & Tokens")}
          to="/settings/networks-tokens"
          icon={<GlobeIcon />}
        />
        <SidebarNavItem label={t("About")} to="/settings/about" icon={<TalismanHandIcon />} />
      </div>
    </div>
  )
}

const SidebarNavItem: FC<{ to: To; icon: ReactNode; label: ReactNode; className?: string }> = ({
  to,
  icon,
  label,
  className,
}) => (
  <NavLink
    to={to}
    className={classNames(
      "flex w-full items-center gap-6 overflow-hidden rounded",
      "text-body-inactive [&.active]:text-body",
      "hover:bg-grey-750 [&.active]:bg-grey-800",
      "h-28 px-6",
      className
    )}
  >
    <span className="size-12 shrink-0 text-lg">{icon}</span>
    <span className="truncate">{label}</span>
  </NavLink>
)
