import { Balance } from "@core/domains/balances/types"
import styled from "styled-components"

export interface IAssetNameOptions {
  withChain?: boolean
}

interface IAssetName extends IAssetNameOptions {
  balance: Balance
  className?: string
}

const AssetName = ({ balance, withChain, className }: IAssetName) => (
  <div className={`${className} chain-name`}>
    <div className="asset-name">{balance.token?.symbol}</div>
    {!!withChain && <div className="chain-name">{(balance.chain || balance.evmNetwork)?.name}</div>}
  </div>
)

const StyledAssetName = styled(AssetName)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.1rem;

  .asset-name {
    line-height: 1.6rem;
    font-size: var(--font-size-normal);
  }

  .chain-name {
    line-height: 1.6rem;
    color: var(--color-mid);
    font-size: var(--font-size-xsmall);
  }
`

export default StyledAssetName
