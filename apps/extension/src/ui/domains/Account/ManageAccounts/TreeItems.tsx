import type { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import type { Account } from "@core/domains/keyring/exports"
import { MoreHorizontalIcon } from "@talismn/icons"
import { Accordion, AccordionIcon } from "@ui/components/Accordion"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { IconButton } from "@ui/components/IconButton"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { useDeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import { useRenameFolderModal } from "@ui/domains/Account/RenameFolderModal"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { cn } from "@ui/util/cn"
import { type FC, Fragment, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { TreeDraggable, TreeDroppable } from "./DragAndDrop"
import { TreeItemAccount } from "./TreeItemAccount"
import type { UiTreeFolder, UiTreeItem } from "./types"

export const TreeItems: FC<{
  treeName: AccountsCatalogTree
  items: UiTreeItem[]
  parentId: string
  disableFolderDrop?: boolean
  accounts: Account[]
  balanceTotalPerAccount: Record<string, number>
}> = ({ treeName, items, parentId, disableFolderDrop, accounts, balanceTotalPerAccount }) => {
  // disallow dropping folders into folders
  const disableDrop = useMemo(
    () => !!disableFolderDrop && parentId !== "root",
    [disableFolderDrop, parentId]
  )

  return (
    <>
      {items
        // dont filter items from the array, this would invalidate the indexes. render null instead if no match
        .map((item, i) =>
          item.isVisible ? (
            <Fragment key={item.id}>
              <SeparatorDropZone parentId={parentId} index={i} disabled={disableDrop} />
              <TreeDraggable parentId={parentId} index={i} id={item.id}>
                <TreeItem
                  treeName={treeName}
                  item={item}
                  isDragged={false}
                  disableFolderDrop={!!disableFolderDrop}
                  accounts={accounts}
                  balanceTotalPerAccount={balanceTotalPerAccount}
                  isInFolder={parentId !== "root"}
                />
              </TreeDraggable>
            </Fragment>
          ) : null
        )}
      {!!items.length && (
        <SeparatorDropZone parentId={parentId} index={items.length} disabled={disableDrop} />
      )}
    </>
  )
}

export const TreeItem: FC<{
  treeName: AccountsCatalogTree
  item: UiTreeItem
  isDragged: boolean
  disableFolderDrop: boolean
  accounts: Account[]
  balanceTotalPerAccount: Record<string, number>
  isInFolder?: boolean
}> = ({
  item,
  isDragged,
  disableFolderDrop,
  accounts,
  balanceTotalPerAccount,
  treeName,
  isInFolder,
}) => {
  return (
    <div id={item.id} className={cn(isDragged ? "cursor-grabbing" : "cursor-grab")}>
      {item.type === "account" && (
        <TreeItemAccount
          address={item.address}
          accounts={accounts}
          balanceTotalPerAccount={balanceTotalPerAccount}
          isInFolder={isInFolder}
          noTooltip={isDragged}
        />
      )}
      {item.type === "folder" && (
        <TreeItemFolder
          treeName={treeName}
          folder={item}
          accounts={accounts}
          balanceTotalPerAccount={balanceTotalPerAccount}
          disableFolderDrop={disableFolderDrop}
        />
      )}
    </div>
  )
}

const SeparatorDropZone: FC<{
  parentId: string
  index: number
  disabled?: boolean
}> = ({ parentId, index, disabled }) => {
  return (
    <TreeDroppable
      className="h-4 w-full shrink-0 p-1"
      isOverClassName="[&>div]:bg-body/80"
      parentId={parentId}
      index={index}
      disabled={disabled}
    >
      <div className="h-full rounded-xs" />
    </TreeDroppable>
  )
}

const TreeItemFolder: FC<{
  folder: UiTreeFolder
  balanceTotalPerAccount: Record<string, number>
  treeName: AccountsCatalogTree
  accounts: Account[]
  disableFolderDrop?: boolean
}> = ({ folder, balanceTotalPerAccount, treeName, accounts, disableFolderDrop }) => {
  const { t } = useTranslation()
  const addresses = useMemo(() => folder.tree.map((item) => item.address), [folder])
  const balanceTotal = useMemo(
    () => addresses.reduce((sum, address) => sum + (balanceTotalPerAccount[address] ?? 0), 0),
    [addresses, balanceTotalPerAccount]
  )

  const { open: renameFolder } = useRenameFolderModal()
  const { open: deleteFolder } = useDeleteFolderModal()

  const { isOpen, toggle } = useOpenClose(true)

  return (
    <div className={cn("@container relative flex flex-col rounded-sm bg-grey-850 pt-2")}>
      <div
        className={cn(
          "flex h-13.25 items-center gap-8 overflow-hidden border border-transparent px-8 pb-0"
        )}
      >
        <AccountFolderIcon className="shrink-0 text-xl" />
        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="flex max-w-full items-center gap-4">
            <div className="truncate">{folder.name}</div>
            <IconButton onClick={toggle} data-no-dnd="true" className="size-10">
              <AccordionIcon isOpen={isOpen} className="text-[1.25rem]" />
            </IconButton>
          </div>
          {addresses.length > 0 && <AccountsLogoStack addresses={addresses} />}
        </div>
        <div className="@2xl:flex hidden flex-col">
          <Fiat amount={balanceTotal} isBalance noCountUp />
        </div>

        <div data-no-dnd="true">
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="rounded p-6 text-body-secondary enabled:hover:bg-grey-750 enabled:hover:text-body disabled:cursor-[inherit] disabled:text-body-disabled">
              <MoreHorizontalIcon className="shrink-0" />
            </ContextMenuTrigger>
            <ContextMenuContent
              data-no-dnd="true"
              className="z-50 flex w-min flex-col whitespace-nowrap rounded-sm border border-grey-800 bg-black px-2 py-3 text-left text-sm shadow-lg"
            >
              <ContextMenuItem onClick={() => renameFolder(folder.id, folder.name, treeName)}>
                {t("Rename")}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => deleteFolder(folder.id, folder.name, treeName)}>
                {t("Delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      <Accordion isOpen={isOpen} className="w-full shrink-0" alwaysRender>
        {!!folder.tree.length && (
          <div className={cn("px-4")}>
            <TreeItems
              treeName={treeName}
              parentId={folder.id}
              items={folder.tree}
              accounts={accounts}
              disableFolderDrop={disableFolderDrop}
              balanceTotalPerAccount={balanceTotalPerAccount}
            />
          </div>
        )}

        {!folder.tree.length && (
          <EmptyFolderDropZone folderId={folder.id} disabled={disableFolderDrop} />
        )}
      </Accordion>
    </div>
  )
}

const EmptyFolderDropZone: FC<{
  folderId: string
  disabled?: boolean
}> = ({ folderId, disabled }) => {
  const { t } = useTranslation()

  return (
    <TreeDroppable
      className="h-32 w-full shrink-0 rounded-b-sm border border-transparent border-dashed bg-grey-800 text-body-disabled"
      hasOverClassName=""
      isOverClassName="bg-body/20 border-body text-body"
      parentId={folderId}
      index={0}
      disabled={disabled}
    >
      <div className="flex size-full flex-col items-center justify-center">
        {t("Drag accounts here")}
      </div>
    </TreeDroppable>
  )
}
