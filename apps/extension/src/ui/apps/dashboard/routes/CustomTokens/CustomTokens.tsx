import HeaderBlock from "@talisman/components/HeaderBlock"
import { IconChevron, PlusIcon } from "@talisman/theme/icons"
import Layout from "@ui/apps/dashboard/layout"
import { useNavigate } from "react-router-dom"
import styled, { css } from "styled-components"
import { CustomErc20Token } from "@core/types"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useCustomErc20Tokens } from "@ui/hooks/useCustomErc20Tokens"
import { Erc20Logo } from "@ui/domains/Erc20Tokens/Erc20Logo"

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

const TokenLogo = styled(Erc20Logo)`
  width: 3.2rem;
  height: 3.2rem;
`

const TokenRow = ({ token }: { token: CustomErc20Token }) => {
  const navigate = useNavigate()
  const network = useEvmNetwork(token.evmNetwork?.id)

  return (
    <TokenRowContainer role="button" onClick={() => navigate(`./${token.id}`)}>
      <TokenLogo id={token.id} />
      <div className="tokenDetails">
        <span className="tokenName">{token.symbol}</span>
        <span className="networkName">{network?.name ?? ""}</span>
      </div>
      <div>
        <IconChevron />
      </div>
    </TokenRowContainer>
  )
}

export const CustomTokens = () => {
  const navigate = useNavigate()
  const { tokens } = useCustomErc20Tokens()

  if (!tokens) return null

  return (
    <Layout withBack centered>
      <HeaderBlock title="Manage custom tokens" text="Add or delete custom ERC20 tokens" />
      <TokensList>
        {tokens.map((token) => (
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
