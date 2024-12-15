import { CreditCardIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

import { SidebarNavItem } from "./SidebarNavItem"

export const DashboardRampSidebar = () => {
  const { t } = useTranslation()
  return (
    <div className="bg-grey-900 flex w-full flex-col gap-8 rounded-lg p-8">
      <div className="flex h-16 shrink-0 items-center">
        <div className="grow pl-4 text-[2rem] font-bold">{t("Buy/sell")}</div>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      <SidebarNavItem to="/portfolio/ramp/buy" label={t("Buy")} icon={<CreditCardIcon />} />
      <SidebarNavItem to="/portfolio/ramp/sell" label={t("Sell")} icon={<CreditCardIcon />} />
    </div>
  )
}
