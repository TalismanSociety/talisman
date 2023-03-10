import { Balances } from "@core/domains/balances/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ChevronLeftIcon, CopyIcon, IconMore, PaperPlaneIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { AccountTypeIcon } from "@ui/domains/Account/NamedAddress"
import Fiat from "@ui/domains/Asset/Fiat"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"

const PageContent = ({ balances }: { balances: Balances }) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { account } = useSelectedAccount()
  const { canExportAccount, open: openExportAccountModal } = useAccountExportModal()
  const { canExportAccount: canExportAccountPk, open: openExportAccountPkModal } =
    useAccountExportPrivateKeyModal()
  const { canRemove, open: openAccountRemoveModal } = useAccountRemoveModal()
  const { canRename, open: openAccountRenameModal } = useAccountRenameModal()
  const { open: openAddressFormatterModal } = useAddressFormatterModal()
  const { genericEvent } = useAnalytics()

  const sendFunds = useCallback(() => {
    api.sendFundsOpen({ from: account?.address })
    genericEvent("open send funds", { from: "popup portfolio" })
  }, [account?.address, genericEvent])

  const copyAddress = useCallback(() => {
    if (!account) return
    openAddressFormatterModal(account.address)
    genericEvent("open copy address", { from: "popup portfolio" })
  }, [account, genericEvent, openAddressFormatterModal])

  const showTxHistory = useIsFeatureEnabled("LINK_TX_HISTORY")
  const browseTxHistory = useCallback(() => {
    genericEvent("open web app tx history", { from: "popup portfolio" })
    window.open(getTransactionHistoryUrl(account?.address), "_blank")
  }, [account, genericEvent])

  const navigate = useNavigate()
  const handleBackBtnClick = useCallback(() => {
    navigate("/portfolio")
  }, [navigate])

  const canAddCustomToken = useMemo(() => isEthereumAddress(account?.address), [account?.address])
  const handleAddCustomToken = useCallback(() => {
    api.dashboardOpen("/tokens/add")
  }, [])

  return (
    <>
      <div className="flex w-full gap-8">
        <div className="flex w-full items-center gap-4 overflow-hidden">
          <IconButton onClick={handleBackBtnClick}>
            <ChevronLeftIcon />
          </IconButton>
          <div className="flex flex-col justify-center">
            <CurrentAccountAvatar className="!text-2xl" />
          </div>
          <div className="flex grow flex-col gap-2 overflow-hidden pl-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="text-body-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                {account ? account.name ?? "Unnamed Account" : "All Accounts"}
              </div>
              <AccountTypeIcon className="text-primary" origin={account?.origin} />
            </div>
            <div className="text-md overflow-hidden text-ellipsis whitespace-nowrap">
              <Fiat amount={balances.sum.fiat("usd").total} isBalance />
            </div>
          </div>
        </div>
        <div className="flex grow items-center justify-end gap-4">
          <IconButton onClick={sendFunds}>
            <WithTooltip tooltip="Send">
              <PaperPlaneIcon />
            </WithTooltip>
          </IconButton>
          {account && (
            <>
              <IconButton onClick={copyAddress}>
                <WithTooltip tooltip="Copy address">
                  <CopyIcon />
                </WithTooltip>
              </IconButton>
              <PopNav
                trigger={
                  <IconButton>
                    <WithTooltip tooltip="More options">
                      <IconMore />
                    </WithTooltip>
                  </IconButton>
                }
                className="icon more"
                closeOnMouseOut
              >
                <PopNav.Item onClick={copyAddress}>Copy address</PopNav.Item>
                {showTxHistory && (
                  <PopNav.Item onClick={browseTxHistory}>Transaction History</PopNav.Item>
                )}
                {canRename && <PopNav.Item onClick={openAccountRenameModal}>Rename</PopNav.Item>}
                {canExportAccount && (
                  <PopNav.Item onClick={openExportAccountModal}>Export as JSON</PopNav.Item>
                )}
                {canExportAccountPk && (
                  <PopNav.Item onClick={openExportAccountPkModal}>Export Private Key</PopNav.Item>
                )}
                {canRemove && (
                  <PopNav.Item onClick={openAccountRemoveModal}>Remove Account</PopNav.Item>
                )}
                {canAddCustomToken && (
                  <PopNav.Item onClick={handleAddCustomToken}>Add Custom Token</PopNav.Item>
                )}
              </PopNav>
            </>
          )}
        </div>
      </div>
      <div className="py-12">
        <PopupAssetsTable balances={balancesToDisplay} />
      </div>
    </>
  )
}

export const PortfolioAssets = () => {
  const { networkBalances } = usePortfolio()
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("ortfolio assets")
  }, [popupOpenEvent])

  return <PageContent balances={networkBalances} />
}
