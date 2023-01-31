import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
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
import styled from "styled-components"
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

const Button = styled.article`
  background-color: var(--color-background-muted);
  outline: none;
  border: none;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1.1rem 1.2rem;
  border-radius: var(--border-radius-tiny);
  cursor: pointer;
  gap: 1.2rem;
  overflow: hidden;

  .chevron {
    color: var(--color-mid);
  }

  &:hover {
    background-color: var(--color-background-muted-3x);
    .chevron {
      color: var(--color-foreground);
    }
  }
`

const CopyButton = styled(IconButton)`
  font-size: 1.4rem;
  line-height: 1.4rem;
  height: 1.4rem;
  width: 1.4rem;
`

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
    <Button onClick={handleAccountClick}>
      <Box flex column justify="center" fontsize="xlarge">
        {address ? (
          <AccountAvatar address={address} genesisHash={genesisHash} />
        ) : (
          <AllAccountsIcon />
        )}
      </Box>
      <Box flex column justify="center" align="flex-start" grow gap={0.4} overflow="hidden">
        <div className="text-body flex w-full items-center gap-3 text-base leading-none">
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">{name}</div>
          {isHardware && (
            <div className="text-primary">
              <UsbIcon />
            </div>
          )}
          {address ? (
            <div className="flex flex-col justify-end">
              <CopyButton onClick={handleCopyClick}>
                <CopyIcon />
              </CopyButton>
            </div>
          ) : null}
        </div>
        <Box
          fg="mid"
          fontsize="small"
          lineheight="small"
          fullwidth
          textalign="left"
          flex
          overflow="hidden"
          textOverflow="ellipsis"
          noWrap
        >
          <Fiat amount={total} isBalance />
        </Box>
      </Box>
      <Box flex column justify="center" fontsize="large">
        <ChevronRightIcon className="chevron" />
      </Box>
    </Button>
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
  <Box flex column fullwidth>
    <TotalFiatBalance />
    <TopActions />
    <Box flex column fullwidth gap={0.8} padding="2.4rem 0">
      {options.map((option) => (
        <AccountButton key={option.address ?? "all"} {...option} />
      ))}
    </Box>
  </Box>
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
