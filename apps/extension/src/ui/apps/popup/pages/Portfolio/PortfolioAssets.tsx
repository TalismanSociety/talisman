import { Balances } from "@core/domains/balances/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { IconButton } from "@talisman/components/IconButton"
import {
  ChevronLeftIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PaperPlaneIcon,
} from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountExportPrivateKeyModal } from "@ui/domains/Account/AccountExportPrivateKeyModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAccountToggleIsPortfolio } from "@ui/hooks/useAccountToggleIsPortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { getTransactionHistoryUrl } from "@ui/util/getTransactionHistoryUrl"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

const PageContent = ({ balances }: { balances: Balances }) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { account } = useSelectedAccount()
  const { canExportAccount, open: openExportAccountModal } = useAccountExportModal()
  const { canExportAccount: canExportAccountPk, open: openExportAccountPkModal } =
    useAccountExportPrivateKeyModal()
  const { canRemove, open: openAccountRemoveModal } = useAccountRemoveModal()
  const { canRename, open: openAccountRenameModal } = useAccountRenameModal()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { canToggleIsPortfolio, toggleIsPortfolio, toggleLabel } =
    useAccountToggleIsPortfolio(account)
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  const { genericEvent } = useAnalytics()

  const sendFunds = useCallback(() => {
    openSendFundsPopup()
    genericEvent("open send funds", { from: "popup portfolio" })
  }, [openSendFundsPopup, genericEvent])

  const copyAddress = useCallback(() => {
    openCopyAddressModal({
      mode: "copy",
      address: account?.address,
    })
    genericEvent("open copy address", { from: "popup portfolio" })
  }, [account, genericEvent, openCopyAddressModal])

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

  const { t } = useTranslation()

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
                {account ? account.name ?? t("Unnamed Account") : t("All Accounts")}
              </div>
              <AccountTypeIcon className="text-primary" origin={account?.origin} />
            </div>
            <div className="text-md overflow-hidden text-ellipsis whitespace-nowrap">
              <Fiat amount={balances.sum.fiat("usd").total} isBalance />
            </div>
          </div>
        </div>
        <div className="flex grow items-center justify-end">
          <Tooltip placement="bottom">
            <TooltipTrigger
              onClick={copyAddress}
              className="hover:bg-grey-800 text-body-secondary hover:text-body text-md flex h-16 w-16 flex-col items-center justify-center rounded-full"
            >
              <CopyIcon />
            </TooltipTrigger>
            <TooltipContent>{t("Copy address")}</TooltipContent>
          </Tooltip>
          <Tooltip placement="bottom">
            <TooltipTrigger
              onClick={canSendFunds ? sendFunds : undefined}
              className={classNames(
                " text-body-secondary text-md flex h-16 w-16 flex-col items-center justify-center rounded-full",
                canSendFunds ? "hover:bg-grey-800 hover:text-body" : "cursor-default opacity-50"
              )}
            >
              <PaperPlaneIcon />
            </TooltipTrigger>
            <TooltipContent>{canSendFunds ? t("Send") : cannotSendFundsReason}</TooltipContent>
          </Tooltip>
          {account && (
            <ContextMenu placement="bottom-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body text-md flex h-16 w-16 flex-col items-center justify-center rounded-full">
                    <MoreHorizontalIcon />
                  </ContextMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>{t("More options")}</TooltipContent>
              </Tooltip>
              <ContextMenuContent className="border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left text-sm shadow-lg">
                <ContextMenuItem onClick={copyAddress}>{t("Copy address")}</ContextMenuItem>
                {showTxHistory && (
                  <ContextMenuItem onClick={browseTxHistory}>
                    {t("Transaction History")}
                  </ContextMenuItem>
                )}
                {canRename && (
                  <ContextMenuItem onClick={openAccountRenameModal}>{t("Rename")}</ContextMenuItem>
                )}
                {canExportAccount && (
                  <ContextMenuItem onClick={openExportAccountModal}>
                    {t("Export as JSON")}
                  </ContextMenuItem>
                )}
                {canExportAccountPk && (
                  <ContextMenuItem onClick={openExportAccountPkModal}>
                    {t("Export Private Key")}
                  </ContextMenuItem>
                )}
                {canRemove && (
                  <ContextMenuItem onClick={openAccountRemoveModal}>
                    {t("Remove Account")}
                  </ContextMenuItem>
                )}
                {canToggleIsPortfolio && (
                  <ContextMenuItem onClick={toggleIsPortfolio}>{toggleLabel}</ContextMenuItem>
                )}
                {canAddCustomToken && (
                  <ContextMenuItem onClick={handleAddCustomToken}>
                    {t("Add Custom Token")}
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
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
    popupOpenEvent("portfolio assets")
  }, [popupOpenEvent])

  return <PageContent balances={networkBalances} />
}
