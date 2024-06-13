import { DraggableAttributes, useDroppable } from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { AccountsCatalogTree } from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { ChevronDownIcon, DragIcon, MoreHorizontalIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { AccountFolderIcon } from "@ui/domains/Account/AccountFolderIcon"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { Fiat } from "@ui/domains/Asset/Fiat"
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
  balanceTotalPerAccount: Record<string, number>
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
    const { item, handleProps, style, accounts, balanceTotalPerAccount, wrapperRef, depth } = props
    const account = accounts.find((account) => account.address === item.address)
    const balanceTotal = balanceTotalPerAccount[account?.address ?? ""] ?? 0

    const formattedAddress = useFormattedAddressForAccount(account)

    if (!account) return null
    return (
      <TreeItemWrapper {...props} ref={wrapperRef}>
        <div ref={ref} className="relative flex items-center gap-8" style={style}>
          <div
            className={classNames(
              "bg-black-secondary flex flex-grow items-center gap-8 overflow-hidden rounded-sm border-[1px] border-transparent p-8",
              depth === 0 && "pl-24",
              depth > 0 && "bg-black-secondary/60"
            )}
          >
            <AccountIcon
              className="text-xl"
              address={item.address}
              genesisHash={account?.genesisHash}
            />
            <div className="flex grow flex-col gap-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {account.name}
                </div>
                <AccountTypeIcon
                  className="text-primary"
                  origin={account.origin}
                  signetUrl={account.signetUrl as string}
                />
              </div>
              <div className="text-body-secondary text-sm">
                <Address address={formattedAddress} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Fiat amount={balanceTotal} isBalance noCountUp />
            </div>

            <AccountContextMenu
              analyticsFrom="settings - accounts"
              address={item.address}
              hideManageAccounts
            />
          </div>

          <DragButton {...handleProps?.attributes} {...handleProps?.listeners} />
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
      balanceTotalPerAccount,
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
    const balanceTotal = useMemo(
      () => addresses.reduce((sum, address) => sum + (balanceTotalPerAccount[address] ?? 0), 0),
      [addresses, balanceTotalPerAccount]
    )
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
          className="relative flex items-center gap-8"
          role="button"
          tabIndex={0}
          onClick={onCollapse}
          onKeyDown={(e) => ["Enter", " "].includes(e.key) && onCollapse?.()}
          style={style}
        >
          <div className="bg-black-secondary flex flex-grow items-center gap-8 overflow-hidden rounded-sm border-[1px] border-transparent p-8">
            <ChevronDownIcon
              className={classNames(
                "text-body-disabled shrink-0 text-base transition-transform",
                (clone || collapsed) && "-rotate-90"
              )}
            />
            <AccountFolderIcon className="shrink-0 text-xl" />
            <div className="flex w-full grow flex-col gap-2 overflow-hidden">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</div>
              {addresses.length > 0 && <AccountsLogoStack addresses={addresses} />}
            </div>
            <div className="flex flex-col">
              <Fiat amount={balanceTotal} isBalance noCountUp />
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
          </div>

          <DragButton {...handleProps?.attributes} {...handleProps?.listeners} />
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

const DragButton = ({ className, ...props }: { className?: string } & object) => (
  <DragIcon className={classNames("text-grey-600 -mx-4 shrink-0 text-lg", className)} {...props} />
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
      className="mt-4 flex items-center gap-8"
      style={{ marginLeft: `${indentationWidth}px` }}
    >
      <div className="bg-black-secondary/60 flex flex-grow flex-col gap-2 rounded px-24 py-16">
        <span>{t("There are no accounts in this folder")}</span>
        <span className="text-body-secondary text-sm">
          {t("You can drag an account here to add it")}
        </span>
      </div>

      <DragButton className="invisible" />
    </div>
  )
}
