import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import {
  AllAccountsIcon,
  ArrowDownIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  PaperPlaneIcon,
} from "@talisman/theme/icons"
import { Balance, Balances } from "@talismn/balances"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { AccountTypeIcon } from "@ui/domains/Account/NamedAddress"
import Fiat from "@ui/domains/Asset/Fiat"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { MouseEventHandler, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PillButton } from "talisman-ui"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Porfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

type AccountOption = {
  address?: string
  name: string
  total?: number
  genesisHash?: string | null
  origin?: string
}

const AccountButton = ({ address, name, total, genesisHash, origin }: AccountOption) => {
  const { open } = useCopyAddressModal()
  const { select } = useSelectedAccount()
  const navigate = useNavigate()
  const { genericEvent } = useAnalytics()

  const handleAccountClick = useCallback(() => {
    select(address)
    navigate("/portfolio/assets")
    genericEvent("select account(s)", {
      type: address ? (isEthereumAddress(address) ? "ethereum" : "substrate") : "all",
      from: "popup",
    })
  }, [address, genericEvent, navigate, select])

  const handleCopyClick: MouseEventHandler<HTMLOrSVGElement> = useCallback(
    (e) => {
      e.stopPropagation()
      if (address) {
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Goto",
          action: "open copy address",
        })
        open({
          mode: "copy",
          address,
        })
      }
    },
    [address, open]
  )

  return (
    <button
      tabIndex={0}
      className="text-body-secondary bg-black-secondary hover:bg-grey-800 flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white"
      onClick={handleAccountClick}
    >
      <div className="flex flex-col justify-center text-xl">
        {address ? (
          <AccountAvatar address={address} genesisHash={genesisHash} />
        ) : (
          <AllAccountsIcon />
        )}
      </div>
      <div className="flex grow flex-col items-start justify-center gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 text-base leading-none">
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">{name}</div>
          <AccountTypeIcon className="text-primary" origin={origin} />
          {address ? (
            <div className="flex flex-col justify-end">
              <CopyIcon
                role="button"
                className="text-body-secondary hover:text-body !text-sm "
                onClick={handleCopyClick}
              />
            </div>
          ) : null}
        </div>
        <div className="text-body-secondary flex w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm leading-none">
          <Fiat amount={total} isBalance />
        </div>
      </div>
      <div className="flex flex-col justify-center text-lg">
        <ChevronRightIcon />
      </div>
    </button>
  )
}

const TopActions = () => {
  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.sendFundsOpen()
    window.close()
  }, [])

  const canBuy = useIsFeatureEnabled("BUY_CRYPTO")
  const handleBuyTokensClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy Crypto button",
    })
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  const { open: openCopyAddressModal } = useCopyAddressModal()
  const handleReceiveClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "open receive",
    })
    openCopyAddressModal({
      mode: "receive",
    })
  }, [openCopyAddressModal])

  const { t } = useTranslation("portfolio")

  return (
    <div className="mt-8 flex justify-center gap-4">
      <>
        <PillButton onClick={handleReceiveClick} icon={ArrowDownIcon}>
          {t("Receive")}
        </PillButton>
        <PillButton onClick={handleSendFundsClick} icon={PaperPlaneIcon}>
          {t("Send")}
        </PillButton>
        {canBuy && (
          <PillButton onClick={handleBuyTokensClick} icon={CreditCardIcon}>
            {t("Buy")}
          </PillButton>
        )}
      </>
    </div>
  )
}

const Accounts = ({ options }: { options: AccountOption[] }) => (
  <div className="flex w-full flex-col">
    <TotalFiatBalance />
    <TopActions />
    <div className="flex w-full flex-col gap-4 py-12">
      {options.map((option) => (
        <AccountButton key={option.address ?? "all"} {...option} />
      ))}
    </div>
  </div>
)

export const PortfolioAccounts = () => {
  const balances = useBalances()
  const myBalances = useBalances("portfolio")
  const accounts = useAccounts()
  const { popupOpenEvent } = useAnalytics()
  const { t } = useTranslation("portfolio")

  const options: AccountOption[] = useMemo(() => {
    // we use this to avoid looping over the balances list n times, where n is the number of accounts in the wallet
    // instead, we'll only interate over the balances one time
    const balancesByAddress: Map<string, Balance[]> = new Map()
    balances.each.forEach((balance) => {
      if (!balancesByAddress.has(balance.address)) balancesByAddress.set(balance.address, [])
      balancesByAddress.get(balance.address)?.push(balance)
    })

    return [
      {
        name: t("All Accounts"),
        total: myBalances.sum.fiat("usd").total,
      },
      ...accounts.map(({ address, name, genesisHash, origin }) => ({
        address,
        genesisHash,
        name: name ?? t("Unknown Account"),
        origin: typeof origin === "string" ? origin : undefined,
        total: new Balances(balancesByAddress.get(address) ?? []).sum.fiat("usd").total,
      })),
    ]
  }, [t, accounts, balances, myBalances])

  useEffect(() => {
    popupOpenEvent("portfolio accounts")
  }, [popupOpenEvent])

  // if only 1 entry (all accounts) it means that accounts aren't loaded
  if (options.length <= 1) return null

  return (
    <FadeIn>
      <Accounts options={options} />
    </FadeIn>
  )
}
