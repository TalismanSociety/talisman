import { AccountJsonAny } from "@extension/core"
import { MoreHorizontalIcon } from "@talismn/icons"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import React, { FC, Suspense, forwardRef, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  PopoverOptions,
} from "talisman-ui"

const ViewOnExplorerMenuItem: FC<{ account: AccountJsonAny }> = ({ account }) => {
  const { t } = useTranslation()
  const { open, canOpen } = useViewOnExplorer(account.address, account?.genesisHash ?? undefined)
  const { genericEvent } = useAnalytics()

  const handleClick = useCallback(() => {
    open()
    genericEvent("open view on explorer", { from: "account menu" })
  }, [genericEvent, open])

  if (!canOpen) return null

  return <ContextMenuItem onClick={handleClick}>{t("View on explorer")}</ContextMenuItem>
}

type Props = {
  analyticsFrom: string
  address?: string
  placement?: PopoverOptions["placement"]
  trigger?: React.ReactNode
  hideManageAccounts?: boolean
}

/**
 * If the `address` prop is a string, this component will operate on the account with the given address.
 * If the `address` prop is undefined, this component will operate on the `selectedAccount` from `useSelectedAccount`.
 * If the `address` prop is null, this component will ignore `selectedAccount`
 */
export const AccountContextMenu = forwardRef<HTMLElement, Props>(function AccountContextMenu(
  { analyticsFrom, address, placement, trigger, hideManageAccounts },
  ref
) {
  const { t } = useTranslation()
  const propsAccount = useAccountByAddress(address)

  const { account: selectedAccount } = useSelectedAccount()
  const account =
    (address === null
      ? // if address prop is null, set account to null
        null
      : address === undefined
      ? // if address prop is undefined, set account to selectedAccount
        selectedAccount
      : // if address prop is a string, set account to propsAccount
        propsAccount) ??
    // make sure account is either an `Account` or undefined
    undefined

  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()

  const { canToggleIsPortfolio, toggleIsPortfolio, toggleLabel } =
    useAccountToggleIsPortfolio(account)

  const chain = useChainByGenesisHash(account?.genesisHash)

  // TODO: These modal providers used to be used in multiple places,
  // hence the hectic API we've got going on here.
  // We should clean them up to just support this one component's use-case.
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const canCopyAddress = !!account
  const copyAddress = useCallback(() => {
    if (!account) return
    genericEvent("open copy address", { from: analyticsFrom })
    openCopyAddressModal({ address: account.address, networkId: chain?.id })
  }, [account, analyticsFrom, chain?.id, genericEvent, openCopyAddressModal])

  const { open: _openAccountRenameModal } = useAccountRenameModal()
  const canRename = !!account
  const openAccountRenameModal = useCallback(
    () => _openAccountRenameModal(account),
    [_openAccountRenameModal, account]
  )

  const { canExportAccountFunc, open: _openAccountExportModal } = useAccountExportModal()
  const canExport = useMemo(() => canExportAccountFunc(account), [account, canExportAccountFunc])
  const openAccountExportModal = useCallback(
    () => _openAccountExportModal(account),
    [_openAccountExportModal, account]
  )

  const { canExportAccountFunc: canExportAccountPkFunc, open: _openAccountExportPkModal } =
    useAccountExportPrivateKeyModal()
  const canExportPk = useMemo(
    () => canExportAccountPkFunc(account),
    [account, canExportAccountPkFunc]
  )
  const openAccountExportPkModal = useCallback(
    () => _openAccountExportPkModal(account),
    [_openAccountExportPkModal, account]
  )

  const { open: _openAccountRemoveModal } = useAccountRemoveModal()
  const openAccountRemoveModal = useCallback(
    () => _openAccountRemoveModal(account),
    [_openAccountRemoveModal, account]
  )

  const goToManageAccounts = useCallback(() => navigate("/settings/accounts"), [navigate])

  return (
    <ContextMenu placement={placement ?? "bottom-end"}>
      <ContextMenuTrigger
        ref={ref}
        className="hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6"
        asChild={!!trigger}
      >
        {trigger ? trigger : <MoreHorizontalIcon className="shrink-0" />}
      </ContextMenuTrigger>
      <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
        <Suspense>
          {account && (
            <>
              {canToggleIsPortfolio && (
                <ContextMenuItem onClick={toggleIsPortfolio}>{toggleLabel}</ContextMenuItem>
              )}
              {canCopyAddress && (
                <ContextMenuItem onClick={copyAddress}>{t("Copy address")}</ContextMenuItem>
              )}
              <ViewOnExplorerMenuItem account={account} />
              {canRename && (
                <ContextMenuItem onClick={openAccountRenameModal}>{t("Rename")}</ContextMenuItem>
              )}
              {canExport && (
                <ContextMenuItem onClick={openAccountExportModal}>
                  {t("Export as JSON")}
                </ContextMenuItem>
              )}
              {canExportPk && (
                <ContextMenuItem onClick={openAccountExportPkModal}>
                  {t("Export private key")}
                </ContextMenuItem>
              )}
              <ContextMenuItem onClick={openAccountRemoveModal}>
                {t("Remove account")}
              </ContextMenuItem>
            </>
          )}
          {!hideManageAccounts && (
            <ContextMenuItem onClick={goToManageAccounts}>{t("Manage accounts")}</ContextMenuItem>
          )}
        </Suspense>
      </ContextMenuContent>
    </ContextMenu>
  )
})
