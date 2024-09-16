import { FolderPlusIcon, PlusIcon, ToolbarSortIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { useNewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { IS_POPUP } from "@ui/util/constants"

import { useManageAccounts } from "./context"

export const ManageAccountsToolbar: FC<{
  analytics: AnalyticsPage
}> = () => {
  const { t } = useTranslation()
  const { search, isReordering, onSearchChange, onToggleReorder } = useManageAccounts()

  const { open: openNewFolderModal } = useNewFolderModal()

  const navigate = useNavigate()
  const addNewAccountClick = useCallback(() => {
    if (IS_POPUP) {
      api.dashboardOpen("/accounts/add")
      return window.close()
    }

    navigate("/accounts/add")
  }, [navigate])

  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-4 overflow-hidden px-8">
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-xs !px-4",
            "[&>input]:text-xs [&>svg]:size-8 [&>button>svg]:size-10"
          )}
          placeholder={t("Search account or folder")}
          onChange={onSearchChange}
          initialValue={search}
        />
      </div>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={addNewAccountClick}
            className="border-grey-700 size-16 ring-transparent focus-visible:border"
          >
            <PlusIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Add Account")}</TooltipContent>
      </Tooltip>
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
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={onToggleReorder}
            className={classNames(
              "border-grey-700 size-16 ring-transparent focus-visible:border",
              isReordering && "text-primary"
            )}
          >
            <ToolbarSortIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Reorder")}</TooltipContent>
      </Tooltip>
    </div>
  )
}
