import { breakpoints } from "@talisman/theme/definitions"
import imgFundWallet from "@talisman/theme/images/fund-wallet.png"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback } from "react"
import styled from "styled-components"

import { useBuyTokensModal } from "../Asset/Buy/BuyTokensModalContext"
import { useCopyAddressModal } from "../CopyAddress/useCopyAddressModal"

const Container = styled.div`
  width: 31.8rem;
  color: var(--color-mid);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  align-items: center;

  @media (min-width: ${breakpoints["2xl"]}px) {
    margin-top: 3rem;
    transform: scale(1.2);
  }
`

const Button = styled.button`
  border-radius: 24px;
  padding: 0.4rem 1.6rem;
  font-size: 1.4rem;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  min-width: 12rem;
  flex-grow: 1;
  line-height: 2.2rem;
`

const DefaultButton = styled(Button)`
  background-color: transparent;
  color: var(--color-foreground);
  border: 1px solid var(--color-foreground);

  :hover {
    background-color: var(--color-foreground);
    color: var(--color-background);
  }
`

const PrimaryButton = styled(Button)`
  background-color: var(--color-primary);
  color: black;
  opacity: 0.9;

  :hover {
    opacity: 1;
  }
`

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Account Funding",
  featureVersion: 1,
  page: "Dashboard - Empty state",
}

export const FundYourWallet = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const showBuyCryptoButton = useIsFeatureEnabled("BUY_CRYPTO")
  const { open: openBuyModal } = useBuyTokensModal()
  const { open: openCopyAddressModal } = useCopyAddressModal()

  const handleReceiveClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "open receive",
    })
    openCopyAddressModal({ mode: "receive" })
  }, [openCopyAddressModal])

  const handleBuyClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy crypto button",
    })
    openBuyModal()
  }, [openBuyModal])

  return (
    <Container>
      <div className="text-md text-white">Fund your wallet</div>
      <div>
        <img height={124} src={imgFundWallet} alt="" />
      </div>
      <div>This is where you'll see your balances.</div>
      <div>Get started with some crypto so you can start using apps.</div>
      <div className="flex w-full gap-4">
        <DefaultButton onClick={handleReceiveClick}>Receive Funds</DefaultButton>
        {showBuyCryptoButton && <PrimaryButton onClick={handleBuyClick}>Buy Crypto</PrimaryButton>}
      </div>
    </Container>
  )
}
