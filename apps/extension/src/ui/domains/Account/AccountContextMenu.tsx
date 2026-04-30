import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { isEthereumAddress } from "@talismn/crypto"
import { MoreHorizontalIcon } from "@talismn/icons"
import { api } from "@ui/api"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import type { PopoverOptions } from "@ui/components/Popover"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddProxyModal } from "@ui/domains/AccountProxies/AddProxy/useAddProxyModal"
import { useManageProxyModal } from "@ui/domains/AccountProxies/ManageProxy/useManageProxyModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useViewOnExplorer } from "@ui/domains/ViewOnExplorer"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useActiveAssetDiscoveryNetworkIds } from "@ui/hooks/useAllActiveNetworkIds"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAccountCanWriteProxies, useAccountProxiesCount } from "@ui/state/accountProxies"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { IS_EMBEDDED_POPUP, IS_POPUP } from "@ui/util/constants"
import type React from "react"
import { type FC, forwardRef, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { usePortfolioNavigation } from "../Portfolio/usePortfolioNavigation"

const ViewOnExplorerMenuItem: FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation()
  const { open, canOpen } = useViewOnExplorer(account.address, getAccountGenesisHash(account))
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
  disabled?: boolean
}

/**
 * If the `address` prop is a string, this component will operate on the account with the given address.
 * If the `address` prop is undefined, this component will operate on the `selectedAccount` from `useSelectedAccount`.
 * If the `address` prop is null, this component will ignore `selectedAccount`
 */
export const AccountContextMenu = forwardRef<HTMLElement, Props>(function AccountContextMenu(
  { analyticsFrom, address, placement, trigger, hideManageAccounts, disabled },
  ref
) {
  const { t } = useTranslation()
  const propsAccount = useAccountByAddress(address)

  const { selectedAccount } = usePortfolioNavigation()
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

  const chain = useNetworkByGenesisHash(getAccountGenesisHash(account))

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

  const networkIds = useActiveAssetDiscoveryNetworkIds()
  const canScanTokens = useMemo(() => account && isEthereumAddress(account.address), [account])
  const scanTokensClick = useCallback(() => {
    if (!account) return
    api.assetDiscoveryStartScan({ networkIds, addresses: [account.address], withApi: true })
    if (IS_POPUP) {
      api.dashboardOpen("/settings/networks-tokens/asset-discovery")
      if (IS_EMBEDDED_POPUP) window.close()
    }
  }, [account, networkIds])

  const goToManageAccounts = useCallback(() => navigate("/settings/accounts"), [navigate])

  // proxy management entry — only surfaced for substrate-compatible accounts.
  // We use the "any non-ethereum" heuristic here; the modals themselves perform
  // the more precise compatibility/network checks.
  const isSubstrate = !!account && !isEthereumAddress(account.address)
  const proxyCount = useAccountProxiesCount(account?.address)
  const canWriteProxies = useAccountCanWriteProxies(account?.address)
  const { open: openManageProxy } = useManageProxyModal()
  const { open: openAddProxy } = useAddProxyModal()
  const proxyMenuKind: "manage" | "add" | null = useMemo(() => {
    if (!account || !isSubstrate) return null
    if (proxyCount > 0) return "manage"
    if (canWriteProxies) return "add"
    return null
  }, [account, canWriteProxies, isSubstrate, proxyCount])

  const onProxyMenuClick = useCallback(() => {
    if (!account || !proxyMenuKind) return
    if (proxyMenuKind === "manage") openManageProxy({ address: account.address })
    else openAddProxy({ address: account.address })
  }, [account, openAddProxy, openManageProxy, proxyMenuKind])

  return (
    <ContextMenu placement={placement ?? "bottom-end"}>
      <ContextMenuTrigger
        ref={ref}
        className="rounded p-6 text-body-secondary enabled:hover:bg-grey-800 enabled:hover:text-body disabled:cursor-[inherit] disabled:text-body-disabled"
        asChild={!!trigger}
        disabled={disabled}
      >
        {trigger ? trigger : <MoreHorizontalIcon className="shrink-0" />}
      </ContextMenuTrigger>
      <ContextMenuContent className="z-50 flex w-min flex-col whitespace-nowrap rounded-sm border border-grey-800 bg-black px-2 py-3 text-left text-sm shadow-lg">
        <Suspense fallback={<SuspenseTracker name="AccountContextMenu" />}>
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
              {canScanTokens && (
                <ContextMenuItem onClick={scanTokensClick}>
                  {t("Scan missing tokens")}
                </ContextMenuItem>
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
              {proxyMenuKind === "manage" && (
                <ContextMenuItem onClick={onProxyMenuClick}>{t("Manage Proxies")}</ContextMenuItem>
              )}
              {proxyMenuKind === "add" && (
                <ContextMenuItem onClick={onProxyMenuClick}>{t("Add Proxy")}</ContextMenuItem>
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
