import { FolderPlusIcon, PlusIcon } from "@talismn/icons"
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

import { useManageAccounts } from "./ManageAccountsProvider"

export const ManageAccountsToolbar: FC<{
  analytics: AnalyticsPage
  className?: string
}> = ({ className }) => {
  const { t } = useTranslation()
  const { search, onSearchChange } = useManageAccounts()

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
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-xs !px-4",
            "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
            "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10"
          )}
          placeholder={t("Search account or folder")}
          onChange={onSearchChange}
          initialValue={search}
        />
      </div>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton onClick={addNewAccountClick}>
            <PlusIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Add Account")}</TooltipContent>
      </Tooltip>
      <Tooltip placement="bottom-end">
        <TooltipTrigger asChild>
          <PortfolioToolbarButton onClick={openNewFolderModal}>
            <FolderPlusIcon />
          </PortfolioToolbarButton>
        </TooltipTrigger>
        <TooltipContent>{t("Add Folder")}</TooltipContent>
      </Tooltip>
    </div>
  )
}