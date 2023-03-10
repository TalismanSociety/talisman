import { Balances } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fragment } from "react"
import styled from "styled-components"

import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { NoTokensMessage } from "../NoTokensMessage"
import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { useAssetDetails } from "./useAssetDetails"
import { useChainTokenBalances } from "./useChainTokenBalances"

const Table = styled.table`
  border-spacing: 0;
  border-collapse: separate;
  width: 100%;
  color: var(--color-mid);
  text-align: left;
  font-weight: 400;
  font-size: 1.6rem;

  > tbody {
    > tr.details td {
      background: var(--color-background-muted);
    }
    > tr.summary td {
      background: var(--color-background-muted-3x);
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

const AssetState = ({
  title,
  render,
  address,
}: {
  title: string
  render: boolean
  address?: Address
}) => {
  if (!render) return null
  return (
    <div className="flex h-[6.6rem] flex-col justify-center gap-2 p-8">
      <div className="font-bold text-white">{title}</div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
    </div>
  )
}

type AssetRowProps = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const ChainTokenBalances = ({ chainId, balances }: AssetRowProps) => {
  const { chainOrNetwork, summary, symbol, detailRows, chain, isFetching, stale, networkType } =
    useChainTokenBalances({ chainId, balances })

  // wait for data to load
  if (!chainOrNetwork || !summary || !symbol || balances.count === 0) return null

  return (
    <>
      <tr className={classNames("summary start-row", detailRows.length === 0 && "stop-row")}>
        <td className="topLeftCell" valign="top">
          <div className="flex h-full">
            <div className="p-8 text-xl">
              <ChainLogo id={chainOrNetwork.id} />
            </div>
            <div className="flex grow flex-col justify-center gap-2 whitespace-nowrap">
              <div className="base text-body flex items-center gap-4 font-bold">
                {chainOrNetwork.name} <CopyAddressButton prefix={chain?.prefix} />
                <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} />
              </div>
              <div>{networkType}</div>
            </div>
          </div>
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens.gt(0)}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            symbol={symbol}
            tooltip="Total Locked Balance"
            stale={stale}
            className={classNames(isFetching && "animate-pulse transition-opacity")}
          />
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={symbol}
            tooltip="Total Available Balance"
            stale={stale}
            className={classNames(isFetching && "animate-pulse transition-opacity")}
          />
        </td>
      </tr>
      {detailRows
        .filter((row) => row.tokens.gt(0))
        .map((row, i, rows) => (
          <tr key={row.key} className={classNames("details", rows.length === i + 1 && "stop-row")}>
            <td className="al-main" valign="top">
              <AssetState title={row.title} render address={row.address} />
            </td>
            <td align="right" valign="top"></td>
            <td align="right" valign="top">
              <AssetBalanceCellValue
                render={row.tokens.gt(0)}
                tokens={row.tokens}
                fiat={row.fiat}
                symbol={symbol}
                locked={row.locked}
                stale={stale}
                className={classNames(isFetching && "animate-pulse transition-opacity")}
              />
            </td>
          </tr>
        ))}
    </>
  )
}

type AssetsTableProps = {
  balances: Balances
  symbol: string
}

export const DashboardAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain, isLoading } = useAssetDetails(balances)

  const rows = Object.entries(balancesByChain)
  if (rows.length === 0 && !isLoading) return <NoTokensMessage symbol={symbol} />

  return (
    <Table>
      <tbody>
        {rows.map(([chainId, bal], i, rows) => (
          <Fragment key={chainId}>
            <ChainTokenBalances chainId={chainId} balances={bal} />
            {i < rows.length - 1 && <SpacerRow />}
          </Fragment>
        ))}
        <tr>
          <td></td>
          <td width="30%"></td>
          <td width="30%"></td>
        </tr>
      </tbody>
    </Table>
  )
}
