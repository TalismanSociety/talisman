import { AccountsCatalogTree } from "@core/domains/accounts/helpers.catalog"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { DraggableAttributes, useDroppable } from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { Balances } from "@talismn/balances"
import { ChevronDownIcon, DragIcon, MoreHorizontalIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import Fiat from "@ui/domains/Asset/Fiat"
import { useBalanceDetails } from "@ui/hooks/useBalanceDetails"
import { useFormattedAddressForAccount } from "@ui/hooks/useFormattedAddress"
import { CSSProperties, ReactNode, forwardRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

import { AccountsLogoStack } from "./AccountsLogoStack"
import { useDeleteFolderModal } from "./DeleteFolderModal"
import { useRenameFolderModal } from "./RenameFolderModal"
import { UiTreeAccount, UiTreeFolder, UiTreeItem } from "./types"

export interface Props {
  accounts: AccountJsonAny[]
  balances: Balances
  childCount?: number
  clone?: boolean
  collapsed?: boolean
  depth: number
  disableInteraction?: boolean
  disableSelection?: boolean
  ghost?: boolean
  handleProps?: { attributes: DraggableAttributes; listeners?: SyntheticListenerMap }
  indentationWidth: number
  item: UiTreeItem
  treeName: AccountsCatalogTree
  style: CSSProperties
  onCollapse?(): void
  wrapperRef?(node: HTMLLIElement): void
}

export const TreeItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { item } = props

  if (item.type === "account") return <TreeAccountItem {...props} item={item} ref={ref} />
  return <TreeFolderItem {...props} item={item} ref={ref} />
})
TreeItem.displayName = "TreeItem"

export const TreeAccountItem = forwardRef<HTMLDivElement, Props & { item: UiTreeAccount }>(
  (props, ref) => {
    const { item, handleProps, style, accounts, balances, wrapperRef, depth } = props
    const account = accounts.find((account) => account.address === item.address)
    const accountBalances = useMemo(
      () => balances.find({ address: account?.address }),
      [account, balances]
    )
    const { totalUsd } = useBalanceDetails(accountBalances)

    const formattedAddress = useFormattedAddressForAccount(account)

    if (!account) return null
    return (
      <TreeItemWrapper {...props} ref={wrapperRef}>
        <div
          ref={ref}
          className={classNames(
            "bg-black-secondary relative flex items-center gap-8 rounded-sm border-[1px] border-transparent p-8",
            depth > 0 && "bg-black-secondary/60"
          )}
          style={style}
        >
          <DragButton {...handleProps?.attributes} {...handleProps?.listeners} />
          <AccountIcon
            className="text-xl"
            address={item.address}
            genesisHash={account?.genesisHash}
          />
          <div className="flex grow flex-col gap-2 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
              <AccountTypeIcon className="text-primary" origin={account.origin} />
            </div>
            <div className="text-body-secondary text-sm">
              <Address address={formattedAddress} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Fiat amount={totalUsd} isBalance />
          </div>

          <AccountContextMenu
            analyticsFrom="settings - accounts"
            address={item.address}
            hideManageAccounts
          />
        </div>
      </TreeItemWrapper>
    )
  }
)
TreeAccountItem.displayName = "TreeAccountItem"

export const TreeFolderItem = forwardRef<HTMLDivElement, Props & { item: UiTreeFolder }>(
  (props, ref) => {
    const { t } = useTranslation()
    const {
      balances,
      childCount,
      clone,
      handleProps,
      item,
      treeName,
      collapsed,
      onCollapse,
      style,
      wrapperRef,
      indentationWidth,
    } = props

    const addresses = useMemo(() => item.tree.map((item) => item.address), [item])
    const folderBalances = useMemo(
      () => balances.find((b) => addresses.includes(b.address)),
      [addresses, balances]
    )
    const { totalUsd } = useBalanceDetails(folderBalances)
    const stopPropagation =
      <T extends Pick<Event, "stopPropagation">>(andThen?: (event: T) => void) =>
      (event: T) => {
        event.stopPropagation()
        andThen && andThen(event)
      }

    const { open: renameFolder } = useRenameFolderModal()
    const { open: deleteFolder } = useDeleteFolderModal()

    return (
      <TreeItemWrapper {...props} ref={wrapperRef}>
        <div
          ref={ref}
          className="bg-black-secondary relative flex items-center gap-8 rounded-sm border-[1px] border-transparent p-8"
          role="button"
          tabIndex={0}
          onClick={onCollapse}
          onKeyDown={(e) => ["Enter", " "].includes(e.key) && onCollapse?.()}
          style={style}
        >
          <DragButton {...handleProps?.attributes} {...handleProps?.listeners} />
          <AccountFolderIcon className="shrink-0 text-xl" />
          <div className="flex w-full grow flex-col gap-2 overflow-hidden">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</div>
            {addresses.length > 0 && <AccountsLogoStack addresses={addresses} />}
          </div>
          <ChevronDownIcon
            className={classNames(
              "text-body-disabled shrink-0 transition-transform",
              (clone || collapsed) && "-rotate-90"
            )}
          />
          <div className="flex flex-col">
            <Fiat amount={totalUsd} isBalance />
          </div>

          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger
              className="hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6"
              onClick={stopPropagation()}
            >
              <MoreHorizontalIcon className="shrink-0" />
            </ContextMenuTrigger>
            <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
              <ContextMenuItem
                onClick={stopPropagation(() => renameFolder(item.id, item.name, treeName))}
              >
                {t("Rename")}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={stopPropagation(() => deleteFolder(item.id, item.name, treeName))}
              >
                {t("Delete")}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {clone && childCount && childCount > 0 ? (
            <span
              className={classNames(
                "bg-black-tertiary text-primary rounded-xs absolute -right-5 -top-5 flex h-12 w-12 items-center justify-center text-xs",
                clone && "select-none"
              )}
            >
              {childCount}
            </span>
          ) : null}
        </div>

        {!clone && !collapsed && item.tree.length === 0 ? (
          <EmptyFolderDropzone id={item.id} indentationWidth={indentationWidth} />
        ) : null}
      </TreeItemWrapper>
    )
  }
)
TreeFolderItem.displayName = "TreeFolderItem"

const TreeItemWrapper = forwardRef<HTMLLIElement, Props & { children?: ReactNode | undefined }>(
  (
    { children, clone, depth, disableInteraction, disableSelection, ghost, indentationWidth },
    ref
  ) => (
    <li
      className={classNames(
        "-mb-[1px] list-none",
        clone && "pointer-events-none",
        ghost && "opacity-50",
        disableSelection && "select-none",
        disableInteraction && "pointer-events-none"
      )}
      ref={ref}
      style={{ paddingLeft: clone ? undefined : `${indentationWidth * depth}px` }}
    >
      {children}
    </li>
  )
)
TreeItemWrapper.displayName = "TreeItemWrapper"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DragButton = (props: any) => (
  <DragIcon className="text-grey-750 -mx-4 shrink-0 text-xl" {...props} />
)

const EmptyFolderDropzone = ({
  id,
  indentationWidth,
}: {
  id: string
  indentationWidth: number
}) => {
  const { t } = useTranslation()
  const { setNodeRef } = useDroppable({ id: `empty-folder-${id}` })

  return (
    <div
      ref={setNodeRef}
      className="bg-black-secondary/60 mt-4 flex flex-col gap-2 rounded p-20"
      style={{ marginLeft: `${indentationWidth}px` }}
    >
      <span className="">{t("There are no accounts in this folder")}</span>
      <span className="text-body-secondary text-sm">
        {t("You can drag an account here to add it")}
      </span>
    </div>
  )
}
