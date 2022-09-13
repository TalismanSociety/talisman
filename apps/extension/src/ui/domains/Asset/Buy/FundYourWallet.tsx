import { Box } from "@talisman/components/Box"
import imgFundWallet from "@talisman/theme/images/fund-wallet.png"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"

import { useBuyTokensModal } from "./BuyTokensModalContext"

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

export const FundYourWallet = () => {
  const { open: openBuyModal } = useBuyTokensModal()
  const { open: openCopyModal } = useAddressFormatterModal()
  const { account, accounts } = useSelectedAccount()
  const [address, setAddress] = useState<string>()

  useEffect(() => {
    setAddress(account?.address ?? accounts.find(({ origin }) => origin === "ROOT")?.address)
  }, [account?.address, accounts])

  const handleCopyClick = useCallback(() => {
    if (!address) return
    openCopyModal(address)
  }, [address, openCopyModal])

  return (
    <Box w={31.8} fg="mid" textalign="center" flex column gap={2.4} align="center">
      <Box fg="foreground" fontsize="medium">
        Fund your wallet
      </Box>
      <Box>
        <img height={124} src={imgFundWallet} alt="" />
      </Box>
      <Box>This is where you'll see your balances.</Box>
      <Box>Get started with some crypto so you can start using apps.</Box>
      <Box flex gap={0.8} fullwidth>
        <DefaultButton onClick={handleCopyClick}>Receive Funds</DefaultButton>
        <PrimaryButton onClick={openBuyModal}>Buy Crypto</PrimaryButton>
      </Box>
    </Box>
  )
}
