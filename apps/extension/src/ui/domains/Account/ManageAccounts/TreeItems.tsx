import { classNames } from "@talismn/util"
import { AccountJsonAny, AccountsCatalogTree } from "extension-core"
import { FC, Fragment, useMemo } from "react"

import { TreeDraggable, TreeDroppable } from "./DragAndDrop"
import { TreeItemAccount } from "./TreeItemAccount"
import { TreeItemFolder } from "./TreeItemFolder"
import { UiTreeItem } from "./types"

export const TreeItems: FC<{
  treeName: AccountsCatalogTree
  items: UiTreeItem[]
  parentId: string
  disableFolderDrop?: boolean
  accounts: AccountJsonAny[]
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
  accounts: AccountJsonAny[]
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
    <div id={item.id} className={classNames(isDragged ? "cursor-grabbing" : "cursor-grab")}>
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
      <div className="rounded-xs h-full" />
    </TreeDroppable>
  )
}
