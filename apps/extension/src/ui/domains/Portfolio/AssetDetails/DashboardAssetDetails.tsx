import {
  BalanceFormatter,
  BalanceLockType,
  Balances,
  LockedBalance,
} from "@core/domains/balances/types"
import { encodeAnyAddress } from "@core/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import { useNotification } from "@talisman/components/Notification"
import { CopyIcon, LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { api } from "@ui/api"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import useTokens from "@ui/hooks/useTokens"
import { flatMap } from "lodash"
import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import StyledAssetLogo from "../../Asset/Logo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { NoTokensMessage } from "../NoTokensMessage"
import { getBalanceLockTypeTitle } from "./getBalanceLockTypeTitle"
import { useAssetDetails } from "./useAssetDetails"

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
    <Box h={6.6} padding="1.6rem" flex column justify="center">
      <Box bold fg="foreground">
        {title}
      </Box>
    </Box>
  )
}

const SmallIconButton = styled(IconButton)`
  height: 1.2rem;
  width: 1.2rem;
  font-size: var(--font-size-xsmall);
`

const CopyAddressButton = ({ prefix }: { prefix: number | null | undefined }) => {
  const { account } = useSelectedAccount()
  const notification = useNotification()

  const address = useMemo(() => {
    if (!account) return null
    if (isEthereumAddress(account.address)) return account.address
    return encodeAnyAddress(account.address, prefix ?? undefined)
  }, [account, prefix])

  const handleClick = useCallback(() => {
    if (!address) return
    navigator.clipboard.writeText(address)
    notification.success({
      title: `Address copied`,
      subtitle: shortenAddress(address),
    })
  }, [address, notification])

  if (!address) return null

  return (
    <SmallIconButton onClick={handleClick}>
      <CopyIcon />
    </SmallIconButton>
  )
}

const FetchingIndicator = styled(LoaderIcon)`
  line-height: 1;
  font-size: var(--font-size-normal);
`

type AssetRowProps = {
  balances: Balances
  symbol: string
  locks?: LockedBalance[]
}

const ChainTokenBalances = ({ balances, symbol, locks = [] }: AssetRowProps) => {
  const { token, summary } = useTokenBalancesSummary(balances, symbol)

  const detailRows = useMemo(() => {
    return summary
      ? [
          {
            key: "available",
            title: "Available",
            tokens: summary.availableTokens,
            fiat: summary.availableFiat,
          },
          ...locks.map(({ type, amount }) => ({
            key: type,
            title: getBalanceLockTypeTitle(type, locks),
            tokens: BigInt(amount),
            fiat: token?.rates
              ? new BalanceFormatter(amount, token?.decimals, token.rates).fiat("usd")
              : null,
            locked: true,
          })),
          {
            key: "reserved",
            title: "Reserved",
            tokens: summary.reservedTokens,
            fiat: summary.reservedFiat,
            locked: true,
          },
        ].filter((row) => row.tokens > 0)
      : []
  }, [locks, summary, token?.decimals, token?.rates])

  const { chain, evmNetwork } = balances.sorted[0]
  const networkType = useMemo(() => {
    if (evmNetwork) return evmNetwork.isTestnet ? "Testnet" : "EVM blockchain"

    if (chain) {
      if (chain.isTestnet) return "Testnet"
      return chain.paraId ? "Parachain" : "Relay chain"
    }

    return null
  }, [chain, evmNetwork])

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

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
              <Box fontsize="normal" bold fg="foreground" flex align="center" gap={0.8}>
                {chainOrNetwork.name} <CopyAddressButton prefix={chain?.prefix} />{" "}
                {isFetching && <FetchingIndicator data-spin />}
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
            tooltip="Total Locked Balance"
          />
        </td>
        <td align="right" valign="top">
          <AssetBalanceCellValue
            render
            planck={summary.availableTokens}
            fiat={summary.availableFiat}
            token={token}
            tooltip="Total Available Balance"
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
  symbol: string
}

export const DashboardAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain, lockedByChain, isLoading } = useAssetDetails(balances)

  // const balancesToDisplay = useDisplayBalances(balances)
  // const { account, accounts } = useSelectedAccount()
  // const { hydrate, isLoading } = usePortfolio()

  // const chainIds = useMemo(
  //   () =>
  //     [...new Set(balancesToDisplay.sorted.map((b) => b.chainId ?? b.evmNetworkId))].filter(
  //       (cid) => cid !== undefined
  //     ),
  //   [balancesToDisplay.sorted]
  // )

  // const addresses = useMemo(() => {
  //   return account ? [account.address] : accounts.map((a) => a.address)
  // }, [account, accounts])

  // const balancesByChain = useMemo(() => {
  //   return chainIds.reduce(
  //     (acc, chainId) => ({
  //       ...acc,
  //       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //       [chainId!]: new Balances(
  //         balancesToDisplay.sorted.filter(
  //           (b) => b.chainId === chainId || b.evmNetworkId === chainId
  //         ),
  //         hydrate
  //       ),
  //     }),
  //     {} as Record<string | number, Balances>
  //   )
  // }, [balancesToDisplay.sorted, chainIds, hydrate])

  // const [lockedByChain, setLockedByChain] = useState<Record<string, LockedBalance[]>>({})
  // const [updateKey, setUpdateKey] = useState<string>()

  // // query locks
  // useEffect(() => {
  //   if (!chainIds.length || !addresses.length) {
  //     setLockedByChain({})
  //     return
  //   }

  //   const substrateChainIds = chainIds.filter((cid) => typeof cid === "string") as string[]

  //   // only update if there is no pending update
  //   // note : balances update so frequently that sometimes it isn't sufficient to prevent identic calls
  //   const callKey = `${addresses.join("-")}|${substrateChainIds.join}`
  //   if (callKey === updateKey) return
  //   setUpdateKey(callKey)

  //   Promise.all(
  //     substrateChainIds.map((chainId) => api.getBalanceLocks({ chainId, addresses }))
  //   ).then((chainLocks) => {
  //     const locks: Record<string, LockedBalance[]> = {}
  //     substrateChainIds.forEach((chainId, index) => {
  //       const allChainLocks = flatMap(Object.values(chainLocks[index]))
  //       // regroup by type
  //       const consolidated = allChainLocks.reduce<LockedBalance[]>((acc, lock) => {
  //         const existing = acc.find((l) => l.type === lock.type)
  //         if (existing) existing.amount = (BigInt(existing.amount) + BigInt(lock.amount)).toString()
  //         else acc.push(lock)
  //         return acc
  //       }, [])
  //       locks[chainId] = consolidated
  //     })
  //     setLockedByChain(locks)
  //   })
  // }, [addresses, chainIds, updateKey])

  const rows = Object.entries(balancesByChain)
  if (rows.length === 0 && !isLoading) return <NoTokensMessage symbol={symbol} />

  return (
    <Table>
      <tbody>
        {rows.map(([key, bal], i, rows) => (
          <Fragment key={key}>
            <ChainTokenBalances symbol={symbol} balances={bal} locks={lockedByChain[key]} />
            {i < rows.length - 1 && <SpacerRow />}
          </Fragment>
        ))}
      </tbody>
    </Table>
  )
}
