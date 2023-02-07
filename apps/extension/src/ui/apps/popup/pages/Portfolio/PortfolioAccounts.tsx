import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import { IconButton } from "@talisman/components/IconButton"
import {
  AllAccountsIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  PaperPlaneIcon,
  UsbIcon,
  ZapIcon,
} from "@talisman/theme/icons"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useBalances from "@ui/hooks/useBalances"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { MouseEventHandler, useCallback, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PillButton } from "talisman-ui"

import { TotalFiatBalance } from "../../components/TotalFiatBalance"

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
  isHardware?: boolean
}

const AccountButton = ({ address, name, total, genesisHash, isHardware }: AccountOption) => {
  const { open } = useAddressFormatterModal()
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

  const handleCopyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      if (address) open(address)
    },
    [address, open]
  )

  return (
    <article
      role="button"
      tabIndex={0}
      className="text-body-secondary bg-grey-900 hover:bg-grey-800 flex h-[5.9rem] w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 hover:text-white"
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
          {isHardware && (
            <div className="text-primary">
              <UsbIcon />
            </div>
          )}
          {address ? (
            <div className="flex flex-col justify-end">
              <IconButton className="!h-8 !w-8 !text-sm leading-none" onClick={handleCopyClick}>
                <CopyIcon />
              </IconButton>
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
    </article>
  )
}

const TopActions = () => {
  const handleSendFundsClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Send Funds button",
    })
    await api.modalOpen({ modalType: "send" })
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

  const showStaking = useIsFeatureEnabled("LINK_STAKING")
  const handleStakingClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Staking button",
    })
    window.open("https://app.talisman.xyz/staking", "_blank")
    close()
  }, [])

  return (
    <div className="mt-8 flex justify-center gap-4">
      <>
        {showStaking && (
          <PillButton onClick={handleStakingClick} icon={ZapIcon}>
            Stake
          </PillButton>
        )}
        <PillButton onClick={handleSendFundsClick} icon={PaperPlaneIcon}>
          Send
        </PillButton>
        {canBuy && (
          <PillButton onClick={handleBuyTokensClick} icon={CreditCardIcon}>
            Buy
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
  const accounts = useAccounts()
  const { popupOpenEvent } = useAnalytics()

  const options: AccountOption[] = useMemo(() => {
    return [
      {
        name: "All Accounts",
        total: balances.sum.fiat("usd").total,
      },
      ...accounts.map(({ address, name, genesisHash, isHardware }) => ({
        address,
        genesisHash,
        name: name ?? "Unknown Account",
        isHardware,
        total: balances.find({ address }).sum.fiat("usd").total,
      })),
    ]
  }, [accounts, balances])

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
