import { Balance, Balances, Token } from "@core/types"
import { planckToTokens } from "@core/util"
import { LockIcon } from "@talisman/theme/icons"
import { useMemo } from "react"
import styled from "styled-components"
import Fiat from "../Asset/Fiat"
import StyledAssetLogo from "../Asset/Logo"
import Tokens from "../Asset/Tokens"
import { ChainLogoStack } from "./LogoStack"

const Table = styled.table`
  border-spacing: 0 0.8rem;
  width: 100%;
  color: var(--color-mid);
  text-align: left;
  font-weight: 400;
  font-size: 1.6rem;

  th {
    font-size: 1.4rem;
    font-weight: 400;
    padding-bottom: 1rem;
  }

  .al-main {
    border-top-left-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);
    display: flex;

    .al-logo {
      padding: 1.6rem;
      font-size: 3.2rem;
    }

    .al-name {
      font-size: 1.6rem;
      font-weight: 650;
      color: var(--color-foreground);
    }
  }
  .al-locked {
    padding-left: 1.6rem;
  }
  .al-available {
    padding-right: 1.6rem;
    border-top-right-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
  }

  .right {
    text-align: right;
    svg {
      font-size: 0.9em;
    }
  }

  tbody tr {
    cursor: pointer;
    td {
      background: var(--color-background-muted);
    }
    :hover td {
      background: var(--color-background-muted-3x);
    }
  }

  .white {
    color: var(--color-foreground);
  }

  .vflex {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.4rem;
  }

  .grow {
    flex-grow: 1;
  }
`

type AssetRowProps = {
  balances: Balance[]
}

type BalanceSummary = {
  lockedTokens: bigint
  lockedFiat: number | null
  availableTokens: bigint
  availableFiat: number | null
}

export const AssetRow = ({ balances }: AssetRowProps) => {
  // TODO would be nice to be able to use balances.sum but this is only available for fiat

  // use chainId as token key
  const { token, chainId, chainIds, lockedTokens, lockedFiat, availableTokens, availableFiat } =
    useMemo(() => {
      const { token, chainId } = balances[0]
      const chainIds = [...new Set(balances.map((b) => b.chainId))]

      const summary = balances.reduce<BalanceSummary>(
        ({ lockedTokens, lockedFiat, availableTokens, availableFiat }, b) => ({
          lockedTokens: lockedTokens + b.frozen.planck + b.reserved.planck,
          lockedFiat: token?.rates
            ? lockedFiat! + (b.frozen.fiat("usd") ?? 0) + (b.reserved.fiat("usd") ?? 0)
            : null,
          availableTokens: availableTokens + b.transferable.planck,
          availableFiat: token?.rates ? availableFiat! + (b.transferable.fiat("usd") ?? 0) : null,
        }),
        {
          lockedTokens: BigInt(0),
          lockedFiat: token?.rates ? 0 : null,
          availableTokens: BigInt(0),
          availableFiat: token?.rates ? 0 : null,
        }
      )

      return { token, chainId, chainIds, ...summary }
    }, [balances])

  if (!token) return null

  return (
    <tr>
      <td className="al-main">
        <div className="al-logo">
          <StyledAssetLogo id={chainId} />
        </div>
        <div className="vflex grow">
          <div className="al-name">{token.symbol}</div>
          {chainIds?.length > 1 && (
            <div>
              <ChainLogoStack chainIds={chainIds} />
            </div>
          )}
        </div>
      </td>
      <td className="right al-locked">
        {lockedTokens > 0 && (
          <div className="vflex">
            <div>
              <Tokens
                amount={planckToTokens(lockedTokens.toString(), token.decimals)}
                symbol={token.symbol}
                isBalance
              />{" "}
              <LockIcon className="lock" />
            </div>
            <div>
              <Fiat currency="usd" amount={lockedFiat} isBalance />
            </div>
          </div>
        )}
      </td>
      <td className="right al-available">
        <div className="vflex">
          <div className="white">
            <Tokens
              amount={planckToTokens(availableTokens.toString(), token.decimals)}
              symbol={token.symbol}
              isBalance
            />
          </div>
          <div>
            <Fiat currency="usd" amount={availableFiat} isBalance />
          </div>
        </div>
      </td>
    </tr>
  )
}

type AssetsTableProps = {
  balances: Balances
}

export const AssetsTable = ({ balances }: AssetsTableProps) => {
  //TODO : find a safer way of matching tokens
  // group by token (match by symbol + decimals + coingeckoId) ?
  // ! this works only as long as we don't need deep links to token details page
  const balancesByToken = useMemo(
    () =>
      balances.sorted.reduce((acc, b) => {
        if (!b.token || b.total.planck === BigInt(0)) return acc
        const key = `${b.token.symbol}-${b.token.decimals}-${b.token.coingeckoId}`
        if (acc[key]) acc[key].push(b)
        else acc[key] = [b]
        return acc
      }, {} as Record<string, Balance[]>),
    [balances.sorted]
  )

  return (
    <Table>
      <thead>
        <tr>
          <th>Asset</th>
          <th className="right">Locked</th>
          <th className="right">Available</th>
        </tr>
      </thead>
      <tbody>
        {balancesByToken &&
          Object.entries(balancesByToken).map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} />
          ))}
      </tbody>
    </Table>
  )
}
