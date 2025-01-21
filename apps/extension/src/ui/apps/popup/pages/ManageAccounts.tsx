import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import {
  ManageAccountsLists,
  ManageAccountsProvider,
  ManageAccountsToolbar,
  ManageAccountsWelcome,
} from "@ui/domains/Account/ManageAccounts"
import { NewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { RenameFolderModal } from "@ui/domains/Account/RenameFolderModal"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Manage Accounts",
}

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio (back)" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center gap-3 px-8">
      <IconButton onClick={goToPortfolio}>
        <ChevronLeftIcon />
      </IconButton>
      <div className="font-bold">{t("Manage Accounts")}</div>
    </header>
  )
}

export const ManageAccountsPage = () => (
  <PopupLayout>
    <Header />
    <PopupContent>
      <ManageAccountsProvider>
        <ManageAccountsToolbar analytics={ANALYTICS_PAGE} />
        <ManageAccountsLists className="py-8" />
      </ManageAccountsProvider>
    </PopupContent>
    <NewFolderModal />
    <DeleteFolderModal />
    <RenameFolderModal />
    <ManageAccountsWelcome />
  </PopupLayout>
)
