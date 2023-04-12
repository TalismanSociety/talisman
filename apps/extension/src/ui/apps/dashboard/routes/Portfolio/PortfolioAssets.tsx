import { Balances } from "@core/domains/balances/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { IconButton } from "@talisman/components/IconButton"
import { IconMore } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
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
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAppState } from "@ui/hooks/useAppState"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { ButtonHTMLAttributes, FC, MouseEvent, useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger, usePopoverContext } from "talisman-ui"

const PopoverItem: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  onClick,
  className,
  ...props
}) => {
  const { setOpen } = usePopoverContext()

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      setOpen(false)
    },
    [setOpen, onClick]
  )

  return (
    <button
      {...props}
      onClick={handleClick}
      className={classNames("hover:bg-grey-800 rounded-xs h-20 p-6 text-left", className)}
    />
  )
}

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

  const sendFunds = useCallback(() => {
    api.sendFundsOpen({ from: account?.address })
    genericEvent("open send funds", { from: "dashboard portfolio" })
  }, [account?.address, genericEvent])

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

  return (
    <div className="flex w-full flex-col">
      {displayWalletFunding ? (
        <div className="mt-[3.8rem] flex grow items-center justify-center">
          <FundYourWallet />
        </div>
      ) : (
        <>
          <div className="flex w-full gap-8">
            <Statistics className="max-w-[40%]" title="Total Portfolio Value" fiat={portfolio} />
            <Statistics className="max-w-[40%]" title="Locked" fiat={locked} locked />
            <Statistics className="max-w-[40%]" title="Available" fiat={available} />
            <div className="flex grow items-center justify-end gap-8">
              {account && (
                <Popover placement="bottom-end">
                  <PopoverTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body flex h-[1.5em] w-[1.5em] flex-col items-center justify-center rounded-full text-lg">
                    <IconMore />
                  </PopoverTrigger>
                  <PopoverContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
                    <PopoverItem onClick={sendFunds}>Send funds</PopoverItem>
                    <PopoverItem onClick={copyAddress}>Copy address</PopoverItem>
                    {showTxHistory && (
                      <PopoverItem onClick={browseTxHistory}>Transaction History</PopoverItem>
                    )}
                    {canRename && (
                      <PopoverItem onClick={openAccountRenameModal}>Rename</PopoverItem>
                    )}
                    {canExportAccount && (
                      <PopoverItem onClick={openAccountExportModal}>Export as JSON</PopoverItem>
                    )}
                    {canExportAccountPk && (
                      <PopoverItem onClick={openAccountExportPkModal}>
                        Export Private Key
                      </PopoverItem>
                    )}
                    {canRemove && (
                      <PopoverItem onClick={openAccountRemoveModal}>Remove Account</PopoverItem>
                    )}
                    {canAddCustomToken && (
                      <PopoverItem onClick={handleAddCustomToken}>Add Custom Token</PopoverItem>
                    )}
                  </PopoverContent>
                </Popover>
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
