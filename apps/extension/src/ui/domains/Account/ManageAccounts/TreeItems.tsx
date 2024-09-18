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
  allowReorder: boolean
  disableFolderDrop?: boolean
  accounts: AccountJsonAny[]
  balanceTotalPerAccount: Record<string, number>
}> = ({
  treeName,
  items,
  parentId,
  disableFolderDrop,
  allowReorder,
  accounts,
  balanceTotalPerAccount,
}) => {
  const disableDrop = useMemo(
    () => !!disableFolderDrop && parentId !== "root",
    [disableFolderDrop, parentId]
  )

  return (
    <>
      {items.map((item, i) => (
        <Fragment key={item.id}>
          <SeparatorDropZone parentId={parentId} index={i} disabled={disableDrop} />
          <TreeDraggable
            key={item.id}
            parentId={parentId}
            index={i}
            id={item.id}
            disabled={!allowReorder}
          >
            <TreeItem
              treeName={treeName}
              item={item}
              isDragged={false}
              disableFolderDrop={!!disableFolderDrop}
              accounts={accounts}
              balanceTotalPerAccount={balanceTotalPerAccount}
              isInFolder={parentId !== "root"}
              allowReorder={allowReorder}
            />
          </TreeDraggable>
        </Fragment>
      ))}
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
  allowReorder: boolean
}> = ({
  item,
  isDragged,
  disableFolderDrop,
  accounts,
  balanceTotalPerAccount,
  treeName,
  isInFolder,
  allowReorder,
}) => {
  return (
    <div
      className={classNames(
        allowReorder ? (isDragged ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
      )}
    >
      {item.type === "account" && (
        <TreeItemAccount
          address={item.address}
          accounts={accounts}
          balanceTotalPerAccount={balanceTotalPerAccount}
          isInFolder={isInFolder}
          noTooltip={isDragged}
          allowReorder={allowReorder}
        />
      )}
      {item.type === "folder" && (
        <TreeItemFolder
          treeName={treeName}
          folder={item}
          accounts={accounts}
          balanceTotalPerAccount={balanceTotalPerAccount}
          disableFolderDrop={disableFolderDrop}
          allowReorder={allowReorder}
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
      className="h-2 w-full shrink-0 border border-transparent"
      isOverClassName="bg-primary/50"
      parentId={parentId}
      index={index}
      disabled={disabled}
    />
  )
}
