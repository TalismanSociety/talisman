import { ChevronLeftIcon, PlusIcon } from "@talismn/icons"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { SidebarNavItem } from "./SidebarNavItem"

export const SettingsHeader = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const navigate = useNavigate()
  const handleAddAccountClick = useCallback(() => {
    genericEvent("goto add account", { from: "sidebar" })
    navigate("/accounts/add")
  }, [genericEvent, navigate])

  return (
    <header className="p-4 md:px-12 md:pb-6 md:pt-12">
      <SidebarNavItem
        title={t("Back")}
        to="/portfolio"
        icon={<ChevronLeftIcon className="text-body" />}
        iconContainerClassName="flex md:hidden lg:flex"
      >
        <div className="text-body text-lg font-bold">{t("Settings")}</div>
        <div className="text-body-secondary mt-2 hidden items-center text-xs md:flex lg:hidden">
          <ChevronLeftIcon className="-ml-1" />
          <div>{t("Back")}</div>
        </div>
      </SidebarNavItem>
      <SidebarNavItem
        className="mt-16"
        navItemClassName="opacity-80 text-primary hover:text-primary hover:bg-primary/10 hover:opacity-100 [&.active]:text-primary [&.active]:opacity-100"
        title={t("Add Account")}
        to="/accounts/add"
        onClick={handleAddAccountClick}
        icon={<PlusIcon className="bg-primary/10 text-primary rounded-full p-2" />}
      />
    </header>
  )
}
