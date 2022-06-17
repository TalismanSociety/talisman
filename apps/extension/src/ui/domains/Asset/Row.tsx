import styled from "styled-components"
import Logo from "./Logo"
import Name from "./Name"
import Balance, { IAssetBalanceOptions } from "./Balance"
import { Balance as BalanceType } from "@core/types"
import { Erc20Logo } from "../Erc20Tokens/Erc20Logo"

export interface IAssetRowOptions extends IAssetBalanceOptions {}

interface IAssetRowType extends IAssetRowOptions {
  className?: string
  balance: BalanceType
  show: boolean
}

const Erc20tokenLogo = styled(Erc20Logo)`
  font-size: 3rem;
  margin-right: 1.2rem;
`

const AssetRow = ({ className, balance, withFiat, show }: IAssetRowType) => (
  <div className={`${className} chain-balance`} data-show={show}>
    {balance.token?.type === "erc20" ? (
      <Erc20tokenLogo id={balance.tokenId} />
    ) : (
      <Logo
        id={balance.chainId || balance.evmNetwork?.substrateChain?.id || balance.evmNetworkId}
      />
    )}
    <Name balance={balance} withChain />
    <EmptySpace />
    <Balance balance={balance} withFiat={withFiat} isBalance />
  </div>
)

const EmptySpace = styled.div`
  flex-grow: 1;
`

const StyledAssetRow = styled(AssetRow)`
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-background-muted);
  border-radius: var(--border-radius);
  padding: var(--padding-small);
  opacity: 1;
  max-height: 8rem;
  margin-top: 0.3rem;
  transition: var(--transition-speed-slow) ease-in;
  transition-property: opacity, max-height, padding-top, padding-bottom, margin-top;

  .chain-logo {
    font-size: 3rem;
    margin-right: 1.2rem;
  }

  .chain-balance {
    text-align: right;
  }

  // mounted stuff
  &[data-show="false"] {
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    opacity: 0;
  }

  :first-child {
    margin-top: 0;
  }

  .fiat.balance-revealable {
    min-width: 8rem;
  }

  .tokens.balance-revealable {
    min-width: 11rem;
  }
`

export default StyledAssetRow
