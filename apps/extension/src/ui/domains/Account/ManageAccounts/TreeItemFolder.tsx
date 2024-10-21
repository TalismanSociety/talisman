import { MoreHorizontalIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  IconButton,
  useOpenClose,
} from "talisman-ui"

import { AccountJsonAny, AccountsCatalogTree } from "@extension/core"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountsLogoStack } from "@ui/domains/Account/AccountsLogoStack"
import { useDeleteFolderModal } from "@ui/domains/Account/DeleteFolderModal"
import { useRenameFolderModal } from "@ui/domains/Account/RenameFolderModal"
import { Fiat } from "@ui/domains/Asset/Fiat"

import { TreeDroppable } from "./DragAndDrop"
import { TreeItems } from "./TreeItems"
import { UiTreeFolder } from "./types"

export const TreeItemFolder: FC<{
  folder: UiTreeFolder
  balanceTotalPerAccount: Record<string, number>
  treeName: AccountsCatalogTree
  accounts: AccountJsonAny[]
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
    <div className={classNames("@container bg-grey-800 relative flex flex-col rounded-sm pt-2 ")}>
      <div
        className={classNames(
          " flex h-[5.3rem] items-center gap-8 overflow-hidden border-[1px] border-transparent px-8 pb-0"
        )}
      >
        <AccountFolderIcon className="shrink-0 text-xl" />
        <div className="flex w-full grow flex-col gap-2 overflow-hidden">
          <div className="flex max-w-full items-center gap-4">
            <div className="truncate">{folder.name}</div>
            <IconButton onClick={toggle} data-no-dnd="true" className="size-10">
              <AccordionIcon isOpen={isOpen} className="text-[2rem]" />
            </IconButton>
          </div>
          {addresses.length > 0 && <AccountsLogoStack addresses={addresses} />}
        </div>
        <div className="@2xl:flex hidden flex-col">
          <Fiat amount={balanceTotal} isBalance noCountUp />
        </div>

        <div data-no-dnd="true">
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="enabled:hover:bg-grey-750 text-body-secondary enabled:hover:text-body disabled:text-body-disabled rounded p-6 disabled:cursor-[inherit]">
              <MoreHorizontalIcon className="shrink-0" />
            </ContextMenuTrigger>
            <ContextMenuContent
              data-no-dnd="true"
              className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg"
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
          <div className={classNames("px-4")}>
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
      className="bg-grey-850 text-body-disabled h-32 w-full shrink-0 rounded-b-sm border border-dashed border-transparent"
      hasOverClassName=""
      isOverClassName="bg-body/20 border-body text-body"
      parentId={folderId}
      index={0}
      disabled={disabled}
    >
      <div className=" flex size-full flex-col items-center justify-center">
        {t("Drag accounts here")}
      </div>
    </TreeDroppable>
  )
}
