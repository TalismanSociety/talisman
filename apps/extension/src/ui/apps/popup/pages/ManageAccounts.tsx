import { ChevronLeftIcon, FolderPlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { atom, useAtom } from "jotai"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { DeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import { NewFolderModal, useNewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { RenameFolderModal } from "@ui/domains/Account/RenameFolderModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"

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

const searchAtom = atom("")

const Toolbar = () => {
  const { t } = useTranslation()
  const [search, setSearch] = useAtom(searchAtom)
  const { open: openNewFolderModal } = useNewFolderModal()

  useEffect(() => {
    // clear on unmount
    return () => {
      setSearch("")
    }
  }, [setSearch])

  return (
    <div className="flex w-full items-center justify-between gap-4 overflow-hidden px-8">
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-xs !px-4",
            "[&>input]:text-xs [&>svg]:size-8 [&>button>svg]:size-10"
          )}
          placeholder={t("Search account or folder")}
          onChange={setSearch}
          initialValue={search}
        />
      </div>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={openNewFolderModal}
            className="border-grey-700 size-16 ring-transparent focus-visible:border"
          >
            <FolderPlusIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Add Folder")}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export const ManageAccountsPage = () => (
  <PopupLayout>
    <Header />
    <Toolbar />
    <PopupContent>{/* <Content /> */}</PopupContent>

    <NewFolderModal />
    <DeleteFolderModal />
    <RenameFolderModal />
  </PopupLayout>
)
