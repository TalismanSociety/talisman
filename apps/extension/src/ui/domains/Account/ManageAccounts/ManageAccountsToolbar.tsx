import { FolderPlusIcon, MoreHorizontalIcon, PlusIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { SearchInput } from "@talisman/components/SearchInput"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { useNewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { IS_POPUP } from "@ui/util/constants"

import { ExportAllAccountsModal, useExportAllAccountsModal } from "../ExportAllAccountsModal"
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
        className,
      )}
    >
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-sm !px-4",
            "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
            "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
          )}
          placeholder={t("Search account or folder")}
          onChange={onSearchChange}
          initialValue={search}
        />
      </div>
      <ToolbarButton icon={FolderPlusIcon} onClick={openNewFolderModal} label={t("Add Folder")} />
      <ToolbarButton icon={PlusIcon} onClick={addNewAccountClick} label={t("Add Account")} />
      <AccountsContextMenu />
    </div>
  )
}

const ToolbarButton: FC<{
  label?: ReactNode
  icon: FC<{ className?: string }>
  onClick: () => void
}> = ({ label, icon: Icon, onClick }) => (
  <Tooltip placement="bottom-end">
    <TooltipTrigger asChild>
      <PortfolioToolbarButton
        className={classNames(
          "size-[3.6rem]",
          !IS_POPUP && "@2xl:h-[4.4rem] @2xl:px-6 flex h-[3.6rem] w-auto items-center gap-3 px-4",
        )}
        onClick={onClick}
      >
        <Icon />
        {!IS_POPUP && <div>{label}</div>}
      </PortfolioToolbarButton>
    </TooltipTrigger>
    {IS_POPUP && !label && <TooltipContent>{label}</TooltipContent>}
  </Tooltip>
)

const AccountsContextMenu = () => {
  const { t } = useTranslation()

  const { isOpenExportAll, canExportAll, openExportAll, closeExportAll } =
    useExportAllAccountsModal()

  if (!canExportAll) return null

  return (
    <>
      <ContextMenu placement="bottom-end">
        <ContextMenuTrigger
          className={classNames(
            "bg-grey-900 hover:bg-grey-800 text-body-secondary border-content flex items-center justify-center rounded-sm",
            "focus-visible:border-grey-700 border border-transparent ring-transparent",
            "@2xl:size-[4.4rem] size-[3.6rem]",
          )}
        >
          <MoreHorizontalIcon />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={openExportAll}>{t("Export all as JSON")}</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <ExportAllAccountsModal isOpen={isOpenExportAll} onClose={closeExportAll} />
    </>
  )
}
