import { Placement } from "@floating-ui/react"
import { MoreHorizontalIcon } from "@talismn/icons"
import { AccountsCatalogTree, TreeFolder, TreeItem } from "extension-core"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

import { useAccountsCatalog } from "@ui/state"

import { useDeleteFolderModal } from "./DeleteFolderModal"
import { useRenameFolderModal } from "./RenameFolderModal"

export const FolderContextMenu: FC<{
  folderId: string
  trigger?: ReactNode
  noManageAccountsLink?: boolean
  placement?: Placement
}> = ({ folderId, trigger, noManageAccountsLink, placement }) => {
  const { t } = useTranslation()

  const { portfolio, watched } = useAccountsCatalog()

  const [folder, treeName] = useMemo<[TreeFolder | null, AccountsCatalogTree | null]>(() => {
    const portfolioFolder = portfolio.find(folderById(folderId))
    if (portfolioFolder) return [portfolioFolder, "portfolio"]

    const watchedFolder = watched.find(folderById(folderId))
    if (watchedFolder) return [watchedFolder, "watched"]

    return [null, null]
  }, [folderId, portfolio, watched])

  const { open: renameFolder } = useRenameFolderModal()
  const { open: deleteFolder } = useDeleteFolderModal()
  const navigate = useNavigate()

  if (!folder || !treeName) return null

  return (
    <ContextMenu placement={placement}>
      {trigger ?? (
        <ContextMenuTrigger className="enabled:hover:bg-grey-750 text-body-secondary enabled:hover:text-body disabled:text-body-disabled rounded p-6 disabled:cursor-[inherit]">
          <MoreHorizontalIcon className="shrink-0" />
        </ContextMenuTrigger>
      )}
      <ContextMenuContent
        data-no-dnd="true"
        className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg"
      >
        <ContextMenuItem onClick={() => renameFolder(folder.id, folder.name, treeName)}>
          {t("Rename")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => deleteFolder(folder.id, folder.name, treeName)}>
          {t("Delete folder")}
        </ContextMenuItem>
        {!noManageAccountsLink && (
          <ContextMenuItem onClick={() => navigate("/settings/accounts")}>
            {t("Manage accounts")}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

const folderById =
  (id: string) =>
  (folder: TreeItem): folder is TreeFolder =>
    folder.type === "folder" && folder.id === id
