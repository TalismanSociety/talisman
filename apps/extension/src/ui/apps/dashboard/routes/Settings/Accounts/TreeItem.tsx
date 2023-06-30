import { AccountJsonAny } from "@core/domains/accounts/types"
import { DraggableAttributes } from "@dnd-kit/core"
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ChevronDownIcon, DragIcon, FolderIcon, MoreHorizontalIcon } from "@talisman/theme/icons"
import { Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import Fiat from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalanceDetails } from "@ui/hooks/useBalanceDetails"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { CSSProperties, ReactNode, forwardRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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
    const { t } = useTranslation()
    const { item, handleProps, style, accounts, balances, wrapperRef, depth } = props
    const account = accounts.find((account) => account.address === item.address)
    const accountBalances = useMemo(
      () => balances.find({ address: account?.address }),
      [account, balances]
    )
    const { balanceDetails, totalUsd } = useBalanceDetails(accountBalances)

    const { genericEvent } = useAnalytics()
    const { canToggleIsPortfolio, toggleIsPortfolio, toggleLabel } =
      useAccountToggleIsPortfolio(account)
    const { open: openCopyAddressModal } = useCopyAddressModal()
    const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
    const { open: openAccountRenameModal } = useAccountRenameModal()
    const { canExportAccountFunc, open: openAccountExportModal } = useAccountExportModal()
    const { canExportAccountFunc: canExportAccountPkFunc, open: openAccountExportPkModal } =
      useAccountExportPrivateKeyModal()
    const { canRemoveFunc, open: openAccountRemoveModal } = useAccountRemoveModal()
    const canAddCustomToken = useMemo(() => isEthereumAddress(account?.address), [account?.address])
    const navigate = useNavigate()

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
            <div className="flex items-center gap-2">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap">{account.name}</div>
              <AccountTypeIcon className="text-primary" origin={account.origin} />
            </div>
            <div className="text-body-secondary text-sm">
              <Address address={item.address} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <WithTooltip as="div" tooltip={balanceDetails} noWrap>
              <Fiat amount={totalUsd} currency="usd" />
            </WithTooltip>
          </div>

          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6">
              <MoreHorizontalIcon className="shrink-0" />
            </ContextMenuTrigger>
            <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
              {canToggleIsPortfolio && (
                <ContextMenuItem onClick={toggleIsPortfolio}>{toggleLabel}</ContextMenuItem>
              )}
              <ContextMenuItem
                onClick={() => {
                  genericEvent("open copy address", { from: "settings - accounts" })
                  openCopyAddressModal({ mode: "copy", address: account.address })
                }}
              >
                {t("Copy address")}
              </ContextMenuItem>
              {showTxHistory && (
                <ContextMenuItem
                  onClick={() => {
                    genericEvent("open web app tx history", { from: "settings - accounts" })
                    window.open(getTransactionHistoryUrl(account?.address), "_blank")
                  }}
                >
                  {t("Transaction history")}
                </ContextMenuItem>
              )}
              <ContextMenuItem onClick={() => openAccountRenameModal(account)}>
                {t("Rename")}
              </ContextMenuItem>
              {canExportAccountFunc(account) && (
                <ContextMenuItem onClick={() => openAccountExportModal(account)}>
                  {t("Export as JSON")}
                </ContextMenuItem>
              )}
              {canExportAccountPkFunc(account) && (
                <ContextMenuItem onClick={() => openAccountExportPkModal(account)}>
                  {t("Export private key")}
                </ContextMenuItem>
              )}
              {canRemoveFunc(account) && (
                <ContextMenuItem onClick={() => openAccountRemoveModal(account)}>
                  {t("Remove account")}
                </ContextMenuItem>
              )}
              {/*
               ** TODO: Add hidden accounts
               ** (See thread: https://discord.com/channels/969497836410507274/969971058918699110/1124182936841879605)
               */}
              {/* <ContextMenuItem onClick={() => {}}>{t("Hide from portfolio")}</ContextMenuItem> */}
              {/* <ContextMenuItem onClick={() => {}}>{t("Show in portfolio")}</ContextMenuItem> */}

              {canAddCustomToken && (
                <ContextMenuItem onClick={() => navigate("/tokens/add")}>
                  {t("Add custom token")}
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </TreeItemWrapper>
    )
  }
)
TreeAccountItem.displayName = "TreeAccountItem"

export const TreeFolderItem = forwardRef<HTMLDivElement, Props & { item: UiTreeFolder }>(
  (props, ref) => {
    const { t } = useTranslation()
    const { childCount, clone, handleProps, item, collapsed, onCollapse, style, wrapperRef } = props

    const addresses = useMemo(() => item.tree.map((item) => item.address), [item])
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
            {addresses.length > 0 && <AccountsLogoStack addresses={addresses} />}
          </div>

          {collapsed ? (
            <ContextMenu placement="bottom-end">
              <ContextMenuTrigger
                className="hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6"
                onClick={stopPropagation()}
              >
                <MoreHorizontalIcon className="shrink-0" />
              </ContextMenuTrigger>
              <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
                <ContextMenuItem onClick={stopPropagation(() => renameFolder(item.name))}>
                  {t("Rename")}
                </ContextMenuItem>
                {/* TODO: Expose folder colors */}
                {/* <ContextMenuItem onClick={stopPropagation()}>{t("Change color")}</ContextMenuItem> */}
                <ContextMenuItem onClick={stopPropagation(() => deleteFolder(item.name))}>
                  {t("Delete")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ) : (
            <div className="text-body-disabled rounded p-6">
              <ChevronDownIcon className="shrink-0" />
            </div>
          )}

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
