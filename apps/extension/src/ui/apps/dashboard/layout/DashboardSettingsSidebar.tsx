import {
  AlertCircleIcon,
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
import { FC, ReactNode, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, To, useMatch, useNavigate } from "react-router-dom"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useMnemonicBackup } from "@ui/hooks/useMnemonicBackup"

export const DashboardSettingsSidebar = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()
  const navigate = useNavigate()

  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "sidebar" })
    navigate("/accounts/add")
  }, [genericEvent, navigate])

  return (
    <div className={classNames("bg-grey-900 rounded-lg", "flex w-full flex-col gap-8 p-8")}>
      <div className="flex h-16 shrink-0 items-center">
        <div className="grow pl-4 text-[2rem] font-bold">{t("Settings")}</div>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              onClick={handleAddAccountClick}
              className="bg-primary/10 enabled:hover:bg-primary/20 enabled:hover:text-primary text-primary/90 rounded-full p-3"
            >
              <PlusIcon className="size-10" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{t("Add Account")}</TooltipContent>
        </Tooltip>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      <div className="flex w-full flex-col gap-2">
        <SidebarNavItem to="/settings/general" label={t("General")} icon={<SlidersIcon />} />
        <SidebarNavItem
          label={t("Accounts")}
          to="/settings/accounts"
          icon={<UserIcon />}
          matchPath="/accounts/*"
        />
        <SidebarNavItem
          label={
            <span className="flex items-center gap-2">
              {t("Recovery Phrases")}
              <Suspense fallback={<SuspenseTracker name="SettingsSidebar.MnemonicNotification" />}>
                <MnemonicNotification />
              </Suspense>
            </span>
          }
          to="/settings/mnemonics"
          icon={<SecretIcon />}
        />
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

const SidebarNavItem: FC<{
  to: To
  icon: ReactNode
  label: ReactNode
  matchPath?: string
  className?: string
}> = ({ to, icon, label, matchPath, className }) => {
  const forceActive = useMatch(matchPath ?? "UNEXISTANT_PATH")

  return (
    <NavLink
      to={to}
      className={classNames(
        "flex w-full items-center gap-6 overflow-hidden rounded",
        "text-body-inactive [&.active]:text-body",
        "hover:bg-grey-750 [&.active]:bg-grey-800",
        "h-28 px-6",
        forceActive && "active",
        className,
      )}
    >
      <span className="size-12 shrink-0 text-lg">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

const MnemonicNotification = () => {
  const { allBackedUp } = useMnemonicBackup()

  return !allBackedUp ? <AlertCircleIcon className="text-alert-warn" /> : null
}
