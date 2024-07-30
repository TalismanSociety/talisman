import { ChevronLeftIcon, CopyIcon, MoreHorizontalIcon, SendIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountJsonAny, Balance, Balances } from "extension-core"
import { FC, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ContextMenuTrigger,
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useSearchParamsSelectedFolder } from "@ui/hooks/useSearchParamsSelectedFolder"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"

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

export const PortfolioAssetsHeader: FC<{ backBtnTo?: string }> = ({ backBtnTo }) => {
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

  const formattedAddress = useFormattedAddress(account?.address, account?.genesisHash)

  const location = useLocation()
  const navigate = useNavigate()
  const handleBackBtnClick = useCallback(() => {
    if (backBtnTo) navigate(backBtnTo + location.search)
    else navigate(-1)
  }, [backBtnTo, location.search, navigate])

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
