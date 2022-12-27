import { Balance as BalanceType } from "@core/domains/balances/types"
import styled from "styled-components"

import { AssetLogo } from "./AssetLogo"
import Balance, { IAssetBalanceOptions } from "./Balance"
import Name from "./Name"

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAssetRowOptions extends IAssetBalanceOptions {}

interface IAssetRowType extends IAssetRowOptions {
  className?: string
  balance: BalanceType
  show: boolean
}

const AssetRow = ({ className, balance, withFiat, show }: IAssetRowType) => (
  <div className={`${className} chain-balance`} data-show={show}>
    <AssetLogo id={balance.tokenId} />
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

  .asset-logo {
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
