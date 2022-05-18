import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useNavigate } from "react-router-dom"
import Layout from "../../layout"
import { useCallback } from "react"
import CtaButton from "@talisman/components/CtaButton"
import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"
import styled from "styled-components"
import { useAccountAddSecret } from "./context"
import { AccountAddressType } from "@core/types"

const Buttons = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 2rem;
`

const AccountTypeButton = styled(CtaButton)`
  width: 29.6rem;
  > span.icon {
    width: 3.2rem;
    font-size: 3.2rem;
    margin: 0 1.2rem;
  }
  > span.arrow {
    display: none;
  }
  :hover {
    background: var(--color-background-muted-3x);
  }
`

export const AccountAddSecretType = () => {
  const navigate = useNavigate()
  const { updateData } = useAccountAddSecret()

  const handleClick = useCallback(
    (type: AccountAddressType) => () => {
      updateData({ type })
      navigate("mnemonic")
    },
    [navigate, updateData]
  )

  return (
    <Layout withBack centered>
      <HeaderBlock
        title="Choose account type"
        text="What type of account would you like to import ?              "
      />
      <Spacer />
      <Buttons>
        <AccountTypeButton
          title="Polkadot"
          icon={<PolkadotCircleLogo />}
          subtitle="Polkadot, Kusama &amp; Parachains"
          onClick={handleClick("sr25519")}
        />
        <AccountTypeButton
          title="Ethereum"
          icon={<EthereumCircleLogo />}
          subtitle="Moonbeam, Moonriver, Astar etc."
          onClick={handleClick("ethereum")}
        />
      </Buttons>
    </Layout>
  )
}
