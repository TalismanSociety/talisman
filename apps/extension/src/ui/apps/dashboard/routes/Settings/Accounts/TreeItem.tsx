import { AccountJsonAny } from "@core/domains/accounts/types"
import { DraggableAttributes } from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { WithTooltip } from "@talisman/components/Tooltip"
import {
  ChevronDownIcon,
  DragIcon,
  FolderIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import Fiat from "@ui/domains/Asset/Fiat"
import { CSSProperties, ReactNode, forwardRef, useMemo } from "react"

import { AccountsLogoStack } from "./AccountsLogoStack"
import { Action } from "./Action"
import { UiTreeAccount, UiTreeFolder, UiTreeItem } from "./types"

export interface Props {
  accounts: AccountJsonAny[]
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
  style: CSSProperties
  onCollapse?(): void
  onDelete?(): void
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
    const { item, handleProps, style, accounts, wrapperRef, depth } = props
    const account = accounts.find((account) => account.address === item.address)
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
          <AccountIcon className="text-xl" address={item.address} />
          <div className="flex grow flex-col gap-2 overflow-hidden">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
            <div className="text-body-secondary text-sm">
              <Address address={item.address} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <WithTooltip as="div" tooltip="TODO: Add balance details" noWrap>
              <Fiat amount={0} currency="usd" />
            </WithTooltip>
          </div>
          <MoreHorizontalIcon className="shrink-0" />
        </div>
      </TreeItemWrapper>
    )
  }
)
TreeAccountItem.displayName = "TreeAccountItem"

export const TreeFolderItem = forwardRef<HTMLDivElement, Props & { item: UiTreeFolder }>(
  (props, ref) => {
    const {
      childCount,
      clone,
      handleProps,
      item,
      collapsed,
      onCollapse,
      onDelete,
      style,
      wrapperRef,
    } = props

    const addresses = useMemo(() => item.tree.map((item) => item.address), [item])

    return (
      <TreeItemWrapper {...props} ref={wrapperRef}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
        <div
          ref={ref}
          role="button"
          tabIndex={-1}
          className="bg-black-secondary relative flex items-center gap-8 rounded-sm border-[1px] border-transparent p-8"
          style={style}
          onClick={onCollapse}
        >
          <DragButton {...handleProps?.attributes} {...handleProps?.listeners} />
          <div className="bg-black-tertiary p-4 text-base">
            <FolderIcon style={{ color: item.color }} />
          </div>
          <div className="flex grow flex-col gap-2">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{item.name}</div>
            <AccountsLogoStack addresses={addresses} />
          </div>
          {onCollapse && (
            <Action onClick={onCollapse}>
              <ChevronDownIcon
                className={classNames("transition-transform", collapsed && "-rotate-90")}
              />
            </Action>
          )}
          {collapsed ? (
            <MoreHorizontalIcon className="shrink-0" />
          ) : (
            <ChevronDownIcon className="text-body-disabled shrink-0" />
          )}
          {onDelete && (
            <Action onClick={onDelete}>
              <TrashIcon />
            </Action>
          )}
          {clone && childCount && childCount > 1 ? (
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
