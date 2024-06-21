import { Balance, Balances } from "@extension/core"
import { AccountJsonAny } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChevronLeftIcon, CopyIcon, MoreHorizontalIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PopupNftCollection } from "@ui/domains/Portfolio/AssetsTable/PopupNftCollection"
import { PopupNfts } from "@ui/domains/Portfolio/AssetsTable/PopupNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { FC, Suspense, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch, useNavigate } from "react-router-dom"
import {
  Button,
  ContextMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

const PortfolioAssetsHeader = () => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()

  const allBalances = useBalances()
  const { networkBalances } = usePortfolio()
  const { account } = useSelectedAccount()

  const { folder } = useSearchParamsSelectedFolder()

  const balancesByAddress = useMemo(() => {
    // we use this to avoid looping over the balances list n times, where n is the number of accounts in the wallet
    // instead, we'll only interate over the balances one time
    const balancesByAddress: Map<string, Balance[]> = new Map()
    allBalances.each.forEach((balance) => {
      if (!balancesByAddress.has(balance.address)) balancesByAddress.set(balance.address, [])
      balancesByAddress.get(balance.address)?.push(balance)
    })
    return balancesByAddress
  }, [allBalances.each])

  const balances = useMemo(
    () =>
      account
        ? new Balances(balancesByAddress.get(account.address) ?? [])
        : folder
        ? new Balances(
            folder.tree.flatMap((account) => balancesByAddress.get(account.address) ?? [])
          )
        : // only show networkBalances when no account / folder selected
          // networkBalances is basically the full portfolio, without any watch-only accounts
          // i.e. `Total Portfolio`
          // on the other hand, allBalances includes watch-only accounts
          networkBalances,
    [account, balancesByAddress, folder, networkBalances]
  )
  //const balancesToDisplay = useDisplayBalances(balances)

  const formattedAddress = useFormattedAddress(account?.address, account?.genesisHash)

  const navigate = useNavigate()
  const handleBackBtnClick = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div className="flex w-full gap-8">
      <div className="flex w-full items-center gap-4 overflow-hidden">
        <IconButton onClick={handleBackBtnClick}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="flex flex-col justify-center">
          <CurrentAccountAvatar className="!text-2xl" />
        </div>
        <div className="flex grow flex-col gap-1 overflow-hidden pl-2 text-sm">
          <div className="flex items-center gap-3">
            <div className={classNames("truncate", account ? "text-md" : "text-body-secondary")}>
              {account
                ? account.name ?? t("Unnamed Account")
                : folder
                ? folder.name
                : t("Total Portfolio")}
            </div>
            <AccountTypeIcon
              className="text-primary"
              origin={account?.origin}
              signetUrl={account?.signetUrl as string}
            />
          </div>
          <div className={classNames("truncate", account ? "text-body-secondary" : "text-md")}>
            {account ? (
              <Address address={formattedAddress} />
            ) : (
              <Fiat amount={balances.sum.fiat(currency).total} isBalance />
            )}
          </div>
        </div>
      </div>
      <div className="flex grow items-center justify-end">
        <Suspense>
          <CopyAddressButton account={account} />
          <SendFundsButton account={account} />
          {account && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AccountContextMenu
                  analyticsFrom="popup portfolio"
                  address={account?.address}
                  hideManageAccounts
                  trigger={
                    <ContextMenuTrigger className="hover:bg-grey-800 text-body-secondary hover:text-body text-md flex h-16 w-16 flex-col items-center justify-center rounded-full">
                      <MoreHorizontalIcon />
                    </ContextMenuTrigger>
                  }
                />
              </TooltipTrigger>
              <TooltipContent>{t("More options")}</TooltipContent>
            </Tooltip>
          )}
        </Suspense>
      </div>
    </div>
  )
}

const EnableNetworkMessage: FC<{ type?: "substrate" | "evm" }> = ({ type }) => {
  const { t } = useTranslation()
  const handleClick = useCallback(() => {
    if (type === "substrate") api.dashboardOpen("/settings/networks-tokens/networks/polkadot")
    else if (type === "evm") api.dashboardOpen("/settings/networks-tokens/networks/ethereum")
    else api.dashboardOpen("/settings/networks-tokens/networks")
    window.close()
  }, [type])

  return (
    <div className="text-body-secondary mt-56 flex flex-col items-center justify-center gap-8 text-center">
      <div>{t("Enable some networks to display your assets")}</div>
      <div>
        <Button onClick={handleClick} primary small type="button">
          {t("Manage Networks")}
        </Button>
      </div>
    </div>
  )
}

const SendFundsButton: FC<{ account?: AccountJsonAny }> = ({ account }) => {
  const { t } = useTranslation()
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  const { genericEvent } = useAnalytics()

  const sendFunds = useCallback(() => {
    openSendFundsPopup()
    genericEvent("open send funds", { from: "popup portfolio" })
  }, [openSendFundsPopup, genericEvent])

  return (
    <Tooltip placement="bottom">
      <TooltipTrigger
        onClick={canSendFunds ? sendFunds : undefined}
        className={classNames(
          " text-body-secondary text-md flex h-16 w-16 flex-col items-center justify-center rounded-full",
          canSendFunds ? "hover:bg-grey-800 hover:text-body" : "cursor-default opacity-50"
        )}
      >
        <SendIcon />
      </TooltipTrigger>
      <TooltipContent>{canSendFunds ? t("Send") : cannotSendFundsReason}</TooltipContent>
    </Tooltip>
  )
}

const CopyAddressButton: FC<{ account?: AccountJsonAny }> = ({ account }) => {
  const { t } = useTranslation()
  const { open: openCopyAddressModal } = useCopyAddressModal()

  const { genericEvent } = useAnalytics()

  const chain = useChainByGenesisHash(account?.genesisHash)
  const copyAddress = useCallback(() => {
    openCopyAddressModal({
      address: account?.address,
      networkId: chain?.id,
    })
    genericEvent("open copy address", { from: "popup portfolio" })
  }, [account?.address, chain?.id, genericEvent, openCopyAddressModal])

  return (
    <Tooltip placement="bottom">
      <TooltipTrigger
        onClick={copyAddress}
        className="hover:bg-grey-800 text-body-secondary hover:text-body text-md flex h-16 w-16 flex-col items-center justify-center rounded-full"
      >
        <CopyIcon />
      </TooltipTrigger>
      <TooltipContent>{t("Copy address")}</TooltipContent>
    </Tooltip>
  )
}

const MainContent: FC = () => {
  const { evmNetworks, chains } = usePortfolio()
  const { account } = useSelectedAccount()

  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  if (!account?.type && !evmNetworks.length && !chains.length) return <EnableNetworkMessage />
  if (account?.type === "sr25519" && !chains.length)
    return <EnableNetworkMessage type="substrate" />
  if (
    account?.type === "ethereum" &&
    !evmNetworks.length &&
    !chains.filter((c) => c.account === "secp256k1").length
  )
    return <EnableNetworkMessage type="evm" />

  if (matchTokens) return <PopupAssetsTable />
  if (matchNfts) return <PopupNfts />

  return null
}

const PageContent = () => {
  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  return (
    <>
      <PortfolioAssetsHeader />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      {!!matchTokens && <PortfolioToolbarTokens />}
      {!!matchNfts && <PortfolioToolbarNfts />}
      <div className="py-8">
        <Suspense fallback={<SuspenseTracker name="PortfolioAssets.MainContent" />}>
          <MainContent />
        </Suspense>
      </div>
    </>
  )
}

export const PortfolioAssets = () => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("portfolio assets")
  }, [popupOpenEvent])

  return <PageContent />
}

// TODO move to its own file ? if yes need to extract PortfolioAssetsHeader
export const PortfolioNftCollection = () => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("portfolio nft collection")
  }, [popupOpenEvent])

  return (
    <>
      <PortfolioAssetsHeader />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <PortfolioToolbarNfts />
      <div className="py-8">
        <PopupNftCollection />
      </div>
    </>
  )
}
