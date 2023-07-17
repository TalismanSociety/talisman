import { MoreHorizontalIcon } from "@talisman/theme/icons"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import React, { forwardRef, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

type Props = {
  analyticsFrom: string
  address?: string
  trigger?: React.ReactNode
  hideManageAccounts?: boolean
}

/**
 * If the `address` prop is a string, this component will operate on the account with the given address.
 * If the `address` prop is undefined, this component will operate on the `selectedAccount` from `useSelectedAccount`.
 * If the `address` prop is null, this component will ignore `selectedAccount`
 */
export const AccountContextMenu = forwardRef<HTMLElement, Props>(function AccountContextMenu(
  { analyticsFrom, address, trigger, hideManageAccounts },
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

  const goToManageAccounts = useCallback(() => navigate("/settings/accounts"), [navigate])

  const { canToggleIsPortfolio, toggleIsPortfolio, toggleLabel } =
    useAccountToggleIsPortfolio(account)

  // TODO: These modal providers used to be used in multiple places,
  // hence the hectic API we've got going on here.
  // We should clean them up to just support this one component's use-case.
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const canCopyAddress = !!account
  const copyAddress = useCallback(() => {
    if (!account) return
    genericEvent("open copy address", { from: analyticsFrom })
    openCopyAddressModal({ mode: "copy", address: account.address })
  }, [account, analyticsFrom, genericEvent, openCopyAddressModal])

  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
  const openTxHistory = useCallback(() => {
    genericEvent("open web app tx history", { from: analyticsFrom })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
  }, [account?.address, analyticsFrom, genericEvent])

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

  const { canRemoveFunc, open: _openAccountRemoveModal } = useAccountRemoveModal()
  const canRemove = useMemo(() => canRemoveFunc(account), [account, canRemoveFunc])
  const openAccountRemoveModal = useCallback(
    () => _openAccountRemoveModal(account),
    [_openAccountRemoveModal, account]
  )

  return (
    <ContextMenu placement="bottom-end">
      <ContextMenuTrigger
        ref={ref}
        className="hover:bg-grey-800 text-body-secondary hover:text-body rounded p-6"
        asChild={!!trigger}
      >
        {trigger ? trigger : <MoreHorizontalIcon className="shrink-0" />}
      </ContextMenuTrigger>
      <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
        {!hideManageAccounts && (
          <ContextMenuItem onClick={goToManageAccounts}>{t("Manage accounts")}</ContextMenuItem>
        )}
        {account && (
          <>
            {canToggleIsPortfolio && (
              <ContextMenuItem onClick={toggleIsPortfolio}>{toggleLabel}</ContextMenuItem>
            )}
            {canCopyAddress && (
              <ContextMenuItem onClick={copyAddress}>{t("Copy address")}</ContextMenuItem>
            )}
            {showTxHistory && (
              <ContextMenuItem onClick={openTxHistory}>{t("Transaction history")}</ContextMenuItem>
            )}
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
            {canRemove && (
              <ContextMenuItem onClick={openAccountRemoveModal}>
                {t("Remove account")}
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
})
