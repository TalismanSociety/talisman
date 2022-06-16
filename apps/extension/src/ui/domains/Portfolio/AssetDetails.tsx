import { Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { classNames } from "@talisman/util/classNames"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { Fragment, useMemo } from "react"
import styled from "styled-components"
import StyledAssetLogo from "../Asset/Logo"
import { AssetBalanceCellValue } from "./AssetBalanceCellValue"

const Table = styled.table`
  border-spacing: 0;
  width: 100%;
  color: var(--color-mid);
  text-align: left;
  font-weight: 400;
  font-size: 1.6rem;

  > tbody {
    > tr {
      background: var(--color-background-muted);
      &.summary {
        background: var(--color-background-muted-3x);
      }
    }

    > tr.start-row {
      > td:first-child {
        border-top-left-radius: var(--border-radius);
      }
      > td:last-child {
        border-top-right-radius: var(--border-radius);
      }
    }
    > tr.stop-row {
      > td:first-child {
        border-bottom-left-radius: var(--border-radius);
      }
      > td:last-child {
        border-bottom-right-radius: var(--border-radius);
      }
    }
  }
`

const SpacerRow = styled(({ className }) => {
  return (
    <tr className={className}>
      <td colSpan={3}></td>
    </tr>
  )
})`
  &&& {
    background: transparent;
  }
  td {
    height: 1.6rem;
  }
`

const AssetState = ({ title, render }: { title: string; render: boolean }) => {
  if (!render) return null
  return (
    <Box height={6.6} padding="1.6rem" flex column justify="center">
      <Box bold fg="foreground">
        {title}
      </Box>
    </Box>
  )
}

type AssetRowProps = {
  balances: Balances
}

export const ChainTokenBalances = ({ balances }: AssetRowProps) => {
  const { token, summary } = useTokenBalancesSummary(balances)

  const detailRows = useMemo(
    () =>
      summary
        ? [
            {
              key: "available",
              title: "Available",
              tokens: summary.availableTokens,
              fiat: summary.availableFiat,
            },
            {
              key: "frozen",
              title: "Frozen",
              tokens: summary.frozenTokens,
              fiat: summary.frozenFiat,
              locked: true,
            },
            {
              key: "reserved",
              title: "Reserved",
              tokens: summary.reservedTokens,
              fiat: summary.reservedFiat,
              locked: true,
            },
          ].filter((row) => row.tokens > 0)
        : [],
    [summary]
  )

  const { chain, evmNetwork } = balances.sorted[0]
  const networkType = useMemo(() => {
    if (evmNetwork) return evmNetwork.isTestnet ? "Testnet" : "EVM blockchain"

    if (chain) {
      if (chain.isTestnet) return "Testnet"
      return chain.paraId ? "Parachain" : "Relay chain"
    }

    return null
  }, [chain, evmNetwork])

  const chainOrNetwork = chain || evmNetwork

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  // TODO : detect if user has no token AND that data is loaded, if so display a message + redirect button

  return (
    <>
      <tr className={classNames("summary start-row", detailRows.length === 0 && "stop-row")}>
        <td className="topLeftCell" valign="top">
          <Box fullheight flex>
            <Box padding="1.6rem" fontsize="xlarge">
              <StyledAssetLogo id={evmNetwork?.substrateChain?.id ?? chainOrNetwork.id} />
            </Box>
            <Box grow flex column justify="center" gap={0.4}>
              <Box fontsize="normal" bold fg="foreground">
                {chainOrNetwork.name}
              </Box>
              <div>{networkType}</div>
            </Box>
          </Box>
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens > 0}
            planck={summary.lockedTokens}
            fiat={summary.lockedFiat}
            token={token}
          />
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            render
            planck={summary.availableTokens}
            fiat={summary.availableFiat}
            token={token}
          />
        </td>
      </tr>
      {detailRows
        .filter((row) => row.tokens > 0)
        .map((row, i, rows) => (
          <tr key={row.key} className={classNames(rows.length === i + 1 && "stop-row")}>
            <td className="al-main" valign="top">
              <AssetState title={row.title} render />
            </td>
            <td align="right" valign="top"></td>
            <td align="right" valign="top">
              <AssetBalanceCellValue
                render={row.tokens > 0}
                planck={row.tokens}
                fiat={row.fiat}
                token={token}
                locked={row.locked}
              />
            </td>
          </tr>
        ))}
    </>
  )
}

type AssetsTableProps = {
  balances: Balances
}

export const AssetDetails = ({ balances }: AssetsTableProps) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { hydrate } = usePortfolio()

  const balancesByChain = useMemo(() => {
    const chainIds = [
      ...new Set(balancesToDisplay.sorted.map((b) => b.chainId ?? b.evmNetworkId)),
    ].filter((cid) => cid !== undefined)

    return chainIds.reduce(
      (acc, chainId) => ({
        ...acc,
        [chainId!]: new Balances(
          balancesToDisplay.sorted.filter(
            (b) => b.chainId === chainId || b.evmNetworkId === chainId
          ),
          hydrate
        ),
      }),
      {} as Record<string | number, Balances>
    )
  }, [balancesToDisplay.sorted, hydrate])

  return (
    <Table>
      <tbody>
        {Object.entries(balancesByChain).map(([key, bal], i, rows) => (
          <Fragment key={key}>
            <ChainTokenBalances balances={bal} />
            {i < rows.length - 1 && <SpacerRow />}
          </Fragment>
        ))}
      </tbody>
    </Table>
  )
}
