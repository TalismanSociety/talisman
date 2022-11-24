import { EvmNetwork } from "@core/domains/ethereum/types"
import { CustomErc20Token, Erc20Token } from "@core/domains/tokens/types"
import StyledToggle from "@talisman/components/Field/Toggle"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Pill from "@talisman/components/Pill"
import { IconChevron, PlusIcon } from "@talisman/theme/icons"
import Layout from "@ui/apps/dashboard/layout"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Erc20Logo } from "@ui/domains/Erc20Tokens/Erc20Logo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { EnableTestnetToggle } from "@ui/domains/Settings/EnableTestnetToggle"
import { useCustomErc20Tokens } from "@ui/hooks/useCustomErc20Tokens"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSettings } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import sortBy from "lodash/sortBy"
import { networkInterfaces } from "os"
import { FC, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled, { css } from "styled-components"
import { PillButton } from "talisman-ui"

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

// const TokensList = styled.div`
//   display: flex;
//   flex-direction: column;
//   font-size: 1.6rem;
//   gap: 1.6rem;
//   margin-top: 1.6rem;
// `

// const TokenLogo = styled(Erc20Logo)`
//   width: 3.2rem;
//   height: 3.2rem;
// `

const CustomPill = () => (
  <div className="bg-primary/10 text-primary inline-block rounded p-4 text-sm font-light">
    Custom
  </div>
)

const TokenRow = ({ token }: { token: Erc20Token }) => {
  const navigate = useNavigate()
  const network = useEvmNetwork(token.evmNetwork?.id)

  return (
    <TokenRowContainer role="button" onClick={() => navigate(`./${token.id}`)}>
      <Erc20Logo id={token.id} className="rounded-full text-xl" />
      <div className="tokenDetails">
        {network && (
          <>
            <span className="tokenName">{token.symbol}</span>
            <span className="networkName">{network?.name ?? ""}</span>
          </>
        )}
      </div>
      <div>{isCustomErc20Token(token) && <CustomPill />}</div>
      <div>
        <IconChevron />
      </div>
    </TokenRowContainer>
  )
}

type NetworkTokensGroupProps = { network: EvmNetwork; tokens: Erc20Token[] }
const NetworkTokensGroup: FC<NetworkTokensGroupProps> = ({ network, tokens }) => {
  return (
    <>
      <div className="flex items-center gap-4 pt-8 pb-2">
        <TokenLogo className="inline text-xl" tokenId={network.nativeToken?.id} />{" "}
        <span>{network.name}</span>
      </div>
      {tokens.map((token) => (
        <TokenRow key={token.id} token={token} />
      ))}
    </>
  )
}

export const CustomTokens = () => {
  const navigate = useNavigate()

  const allNetworks = useEvmNetworks()
  const allTokens = useTokens()
  const erc20Tokens = useMemo(() => sortBy(allTokens.filter(isErc20Token), "symbol"), [allTokens])

  const groups = useMemo(() => {
    if (!allNetworks || !erc20Tokens) return []

    return sortBy(allNetworks, "name")
      .map((network) => ({
        network,
        tokens: sortBy(
          erc20Tokens.filter((t) => Number(t.evmNetwork?.id) === network.id),
          "symbol"
        ),
      }))
      .filter(({ tokens }) => tokens.length)
  }, [allNetworks, erc20Tokens])

  if (!erc20Tokens) return null

  return (
    <Layout withBack centered backTo="/settings">
      <HeaderBlock title="Ethereum Tokens" text="Add or delete custom ERC20 tokens" />
      <div className="mt-16 flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton size="xs" className="h-16" onClick={() => navigate("./add")}>
          <div className="flex gap-3">
            <div>
              <PlusIcon className="inline" />
            </div>
            <div>Add token</div>
          </div>
        </PillButton>
      </div>
      <div className="space-y-4">
        {groups.map(({ network, tokens }) => (
          <NetworkTokensGroup key={network.id} network={network} tokens={tokens} />
        ))}
        {/* {erc20Tokens.map((token) => (
          <TokenRow key={token.id} token={token} />
        ))} */}
        {/* <AddTokenButton type="button" onClick={() => navigate("./add")}>
          <PlusIcon />
          Add custom token
        </AddTokenButton> */}
      </div>
    </Layout>
  )
}
