import { Balances } from "@core/domains/balances/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { MoreHorizontalIcon } from "@talisman/theme/icons"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { FundYourWallet } from "@ui/domains/Portfolio/FundYourWallet"
import { NetworkPicker } from "@ui/domains/Portfolio/NetworkPicker"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "talisman-ui"

const PageContent = ({ balances }: { balances: Balances }) => {
  const [hasFunds] = useAppState("hasFunds")
  const balancesToDisplay = useDisplayBalances(balances)
  const { account } = useSelectedAccount()
  const { canExportAccount, open: openAccountExportModal } = useAccountExportModal()
  const { canExportAccount: canExportAccountPk, open: openAccountExportPkModal } =
    useAccountExportPrivateKeyModal()
  const { canRemove, open: openAccountRemoveModal } = useAccountRemoveModal()
  const { canRename, open: openAccountRenameModal } = useAccountRenameModal()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()
  const { canToggleIsPortfolio, toggleIsPortfolio, toggleLabel } =
    useAccountToggleIsPortfolio(account)
  const { canSendFunds, openSendFundsPopup } = useSendFundsPopup(account)

  const sendFunds = useCallback(() => {
    openSendFundsPopup()
    genericEvent("open send funds", { from: "dashboard portfolio" })
  }, [openSendFundsPopup, genericEvent])

  const { portfolio, available, locked } = useMemo(() => {
    const { total, frozen, reserved, transferable } = balancesToDisplay.sum.fiat("usd")
    return {
      portfolio: total,
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balancesToDisplay.sum])

  const copyAddress = useCallback(() => {
    if (!account) return
    openCopyAddressModal({
      mode: "copy",
      address: account.address,
    })
    genericEvent("open copy address", { from: "dashboard portfolio" })
  }, [account, genericEvent, openCopyAddressModal])

  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
  const browseTxHistory = useCallback(() => {
    genericEvent("open web app tx history", { from: "dashboard portfolio" })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
  }, [account, genericEvent])

  const enableWalletFunding = useIsFeatureEnabled("WALLET_FUNDING")
  const displayWalletFunding = useMemo(
    () => !account && Boolean(!hasFunds && enableWalletFunding),
    [account, hasFunds, enableWalletFunding]
  )

  const canAddCustomToken = useMemo(() => isEthereumAddress(account?.address), [account?.address])
  const navigate = useNavigate()
  const handleAddCustomToken = useCallback(() => {
    navigate("/tokens/add")
  }, [navigate])

  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col">
      {displayWalletFunding ? (
        <div className="mt-[3.8rem] flex grow items-center justify-center">
          <FundYourWallet />
        </div>
      ) : (
        <>
          <div className="flex w-full gap-8">
            <Statistics
              className="max-w-[40%]"
              title={t("Total Portfolio Value")}
              fiat={portfolio}
            />
            <Statistics className="max-w-[40%]" title={t("Locked")} fiat={locked} locked />
            <Statistics className="max-w-[40%]" title={t("Available")} fiat={available} />
            <div className="flex grow items-center justify-end gap-8">
              {account && (
                <ContextMenu placement="bottom-end">
                  <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body flex h-[1.5em] w-[1.5em] flex-col items-center justify-center rounded-full text-lg">
                    <MoreHorizontalIcon />
                  </ContextMenuTrigger>
                  <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
                    {canToggleIsPortfolio && (
                      <ContextMenuItem onClick={toggleIsPortfolio}>{toggleLabel}</ContextMenuItem>
                    )}
                    {canSendFunds && (
                      <ContextMenuItem onClick={sendFunds}>{t("Send funds")}</ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={copyAddress}>{t("Copy address")}</ContextMenuItem>
                    {showTxHistory && (
                      <ContextMenuItem onClick={browseTxHistory}>
                        {t("Transaction history")}
                      </ContextMenuItem>
                    )}
                    {canRename && (
                      <ContextMenuItem onClick={() => openAccountRenameModal()}>
                        {t("Rename")}
                      </ContextMenuItem>
                    )}
                    {canExportAccount && (
                      <ContextMenuItem onClick={() => openAccountExportModal()}>
                        {t("Export as JSON")}
                      </ContextMenuItem>
                    )}
                    {canExportAccountPk && (
                      <ContextMenuItem onClick={() => openAccountExportPkModal()}>
                        {t("Export private key")}
                      </ContextMenuItem>
                    )}
                    {canRemove && (
                      <ContextMenuItem onClick={() => openAccountRemoveModal()}>
                        {t("Remove account")}
                      </ContextMenuItem>
                    )}
                    {canAddCustomToken && (
                      <ContextMenuItem onClick={handleAddCustomToken}>
                        {t("Add custom token")}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              )}
            </div>
          </div>
          <div className="mt-[3.8rem]">
            <NetworkPicker />
          </div>
          <div className="mt-6">
            <DashboardAssetsTable balances={balancesToDisplay} />
          </div>
        </>
      )}
    </div>
  )
}

export const PortfolioAssets = () => {
  const { networkBalances } = usePortfolio()
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return <PageContent balances={networkBalances} />
}
