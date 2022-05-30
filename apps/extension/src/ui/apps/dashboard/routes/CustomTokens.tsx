import HeaderBlock from "@talisman/components/HeaderBlock"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { IconMore, PlusIcon } from "@talisman/theme/icons"
import Layout from "@ui/apps/dashboard/layout"
import AssetLogo from "@ui/domains/Asset/Logo"
import { useNavigate } from "react-router-dom"
import styled, { css } from "styled-components"
import { CustomErc20Token } from "@core/types"
import { useEthereumNetwork } from "@ui/hooks/useEthereumNetwork"
import { useCustomErc20Tokens } from "@ui/hooks/useCustomErc20Tokens"

const buttonStyle = css`
  transition: background-color var(--transition-speed-fast) ease-in-out,
    color var(--transition-speed-fast) ease-in-out;

  display: flex;
  height: 5.6rem;
  border: none;
  outline: none;
  background: #1b1b1b;
  color: var(--color-mid);
  border-radius: var(--border-radius);
  text-align: left;
  align-items: center;
  padding: 0 1.6rem;
  gap: 1.6rem;
  cursor: pointer;
`

const TokenRowContainer = styled.div`
  ${buttonStyle}
  background: var(--color-background-muted-3x);
  color: var(--color-foreground-muted-2x);

  :hover {
    color: var(--color-foreground);
  }
  svg {
    font-size: 2.2rem;
  }

  .chain-logo {
    font-size: 3.6rem;
  }

  .tokenDetails {
    flex-grow: 1;
    display: flex;
    flex-direction: column;

    .tokenName {
    }
    .networkName {
      color: var(--color-mid);
    }
  }
`

const AddTokenButton = styled.button`
  ${buttonStyle}
  background: var(--color-background-muted);
  color: var(--color-mid);
  justify-content: center;
  gap: 0.8rem;

  svg {
    font-size: 2.2rem;
  }

  :hover {
    background-color: var(--color-background-muted-3x);
    color: var(--color-foreground);
  }
`

const TokensList = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 1.6rem;
  gap: 1.6rem;
  margin-top: 3.2rem;
`

const TokenRow = ({ token }: { token: CustomErc20Token }) => {
  const navigate = useNavigate()
  const network = useEthereumNetwork(token.evmNetworkId)

  return (
    <TokenRowContainer role="button" onClick={() => navigate(`./edit/${token.id}`)}>
      <AssetLogo id="kusama" />
      <div className="tokenDetails">
        <span className="tokenName">{token.symbol}</span>
        <span className="networkName">{network?.name ?? ""}</span>
      </div>
      <PopNav
        trigger={
          <IconButton>
            <IconMore />
          </IconButton>
        }
        className="icon more"
      >
        <PopNav.Item onClick={() => console.log("edit")}>Edit Token</PopNav.Item>
        <PopNav.Item onClick={() => console.log("remove")}>Remove Token</PopNav.Item>
      </PopNav>
    </TokenRowContainer>
  )
}

export const CustomTokens = () => {
  const navigate = useNavigate()
  const { customErc20Tokens } = useCustomErc20Tokens()

  if (!customErc20Tokens) return null

  return (
    <Layout withBack centered>
      <HeaderBlock title="Manage custom tokens" text="Add or delete custom ERC20 tokens" />
      <TokensList>
        {customErc20Tokens.map((token) => (
          <TokenRow key={token.id} token={token} />
        ))}
        <AddTokenButton type="button" onClick={() => navigate("./add")}>
          <PlusIcon />
          Add custom token
        </AddTokenButton>
      </TokensList>
    </Layout>
  )
}
