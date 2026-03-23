import { FolderPlusIcon, MoreHorizontalIcon, PlusIcon } from "@talismn/icons"
import { api } from "@ui/api"
import type { AnalyticsPage } from "@ui/api/analytics"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { SearchInput } from "@ui/components/SearchInput"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useNewFolderModal } from "@ui/domains/Account/NewFolderModal"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { classNames } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, type ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

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
        className
      )}
    >
      <div className="flex grow items-center overflow-hidden">
        <SearchInput
          containerClassName={classNames(
            "h-[2.25rem] w-full rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
            "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8",
            "@2xl:h-[2.75rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10"
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
          "size-[2.25rem]",
          !IS_POPUP && "flex @2xl:h-[2.75rem] h-[2.25rem] w-auto items-center gap-3 @2xl:px-6 px-4"
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
            "flex items-center justify-center rounded-sm border-content bg-grey-900 text-body-secondary hover:bg-grey-800",
            "border border-transparent ring-transparent focus-visible:border-grey-700",
            "@2xl:size-[2.75rem] size-[2.25rem]"
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
