import { DEBUG } from "@core/constants"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import DcentWebConnector from "dcent-web-connector"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"

import { DcentAccountsList } from "./DcentAccountsList"

export const ConnectDcentAccountsPage = () => {
  const { t } = useTranslation("admin")

  // On unmount, close pop-up window of D'CENT Bridge Service
  useEffect(() => {
    return () => {
      // Skip this in dev mode because of React StrictMode
      if (!DEBUG) DcentWebConnector.popupWindowClose()
    }
  }, [])

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Connect D'CENT account")}
        text={t("Which account(s) would you like to connect ?")}
      />
      <Spacer small />
      <DcentAccountsList />
    </DashboardLayout>
  )
}
