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
  className?: string
}> = ({ className }) => {
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
    <div
      className={classNames(
        "@container flex w-full shrink-0 items-center justify-between gap-4 overflow-hidden",
        className
      )}
    >
      <div className="flex grow items-center overflow-hidden">
        {/* SearchInput needs to remain uncontrolled, so as workaround we empty/disable it when reordering by changing it s key */}
        <SearchInput
          key={isReordering ? "reordering" : "search"}
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-xs !px-4",
            "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
            "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
            isReordering && "opacity-70 cursor-not-allowed"
          )}
          placeholder={t("Search account or folder")}
          onChange={onSearchChange}
          initialValue={search}
          disabled={isReordering}
        />
      </div>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton
            onClick={addNewAccountClick}
            className="border-grey-700 @2xl:size-[4.4rem] size-16 ring-transparent focus-visible:border"
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
            className="border-grey-700 @2xl:size-[4.4rem] size-16 ring-transparent focus-visible:border"
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
              "border-grey-700 @2xl:size-[4.4rem] size-16 ring-transparent focus-visible:border",
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
