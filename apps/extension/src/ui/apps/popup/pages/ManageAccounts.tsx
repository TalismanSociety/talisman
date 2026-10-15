import { ChevronLeftIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import {
  ManageAccountsLists,
  ManageAccountsProvider,
  ManageAccountsToolbar,
  ManageAccountsWelcome,
} from "@ui/domains/Account/ManageAccounts"
import { NewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[2.25rem] w-full shrink-0 items-center gap-3 px-8">
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
    <PopupContent className="px-8">
      <ManageAccountsProvider>
        <ManageAccountsToolbar />
        <ManageAccountsLists className="py-8" />
      </ManageAccountsProvider>
    </PopupContent>
    <NewFolderModal />
    <ManageAccountsWelcome />
  </PopupLayout>
)
