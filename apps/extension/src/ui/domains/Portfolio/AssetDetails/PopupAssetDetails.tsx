import { Balances } from "@core/domains/balances/types"
import { encodeAnyAddress } from "@core/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import { useNotification } from "@talisman/components/Notification"
import { CopyIcon, LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { Fragment, useCallback, useMemo } from "react"
import styled from "styled-components"

import StyledAssetLogo from "../../Asset/Logo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { NoTokensMessage } from "../NoTokensMessage"

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
}

const ChainTokenBlock = styled(Box)`
  > div:first-child {
    border-top-left-radius: var(--border-radius-tiny);
    border-top-right-radius: var(--border-radius-tiny);
  }
  > div:last-child {
    border-bottom-left-radius: var(--border-radius-tiny);
    border-bottom-right-radius: var(--border-radius-tiny);
  }
`

const ChainTokenBalances = ({ balances, symbol }: AssetRowProps) => {
  const { token, summary } = useTokenBalancesSummary(balances, symbol)

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

  const isFetching = useMemo(
    () => balances.sorted.some((b) => b.status === "cache"),
    [balances.sorted]
  )

  const chainOrNetwork = chain || evmNetwork

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  return (
    <ChainTokenBlock borderradius fontsize="small" fg="mid">
      <Box flex fullwidth bg="background-muted-3x" border="transparent">
        <Box grow fullheight flex>
          <Box padding="1.6rem" fontsize="xlarge">
            <StyledAssetLogo id={evmNetwork?.substrateChain?.id ?? chainOrNetwork.id} />
          </Box>
          <Box grow flex column justify="center" gap={0.4}>
            <Box fontsize="normal" bold fg="foreground" flex align="center" gap={0.8}>
              {chainOrNetwork.name} <CopyAddressButton prefix={chain?.prefix} />{" "}
              {isFetching && <FetchingIndicator data-spin />}
            </Box>
            <Box fg="mid">{networkType}</Box>
          </Box>
        </Box>
        <Box>
          <AssetBalanceCellValue
            render
            planck={summary.availableTokens}
            fiat={summary.availableFiat}
            token={token}
          />
        </Box>
      </Box>
      {detailRows
        .filter((row) => row.tokens > 0)
        .map((row, i, rows) => (
          <Box
            flex
            align="center"
            fullwidth
            bg="background-muted"
            key={row.key}
            className={classNames(rows.length === i + 1 && "stop-row")}
          >
            <Box grow padding="0 1.6rem" fg="foreground" bold>
              {row.title}
            </Box>
            <Box>
              <AssetBalanceCellValue
                render={row.tokens > 0}
                planck={row.tokens}
                fiat={row.fiat}
                token={token}
                locked={row.locked}
              />
            </Box>
          </Box>
        ))}
    </ChainTokenBlock>
  )
}

type AssetsTableProps = {
  balances: Balances
  symbol: string
}

export const PopupAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { hydrate, isLoading } = usePortfolio()

  const balancesByChain = useMemo(() => {
    const chainIds = [
      ...new Set(balancesToDisplay.sorted.map((b) => b.chainId ?? b.evmNetworkId)),
    ].filter((cid) => cid !== undefined)

    return chainIds.reduce(
      (acc, chainId) => ({
        ...acc,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

  const rows = Object.entries(balancesByChain)
  if (rows.length === 0 && !isLoading) return <NoTokensMessage symbol={symbol} />

  return (
    <Box flex column gap={1.6}>
      {rows.map(([key, bal], i, rows) => (
        <ChainTokenBalances key={key} symbol={symbol} balances={bal} />
      ))}
    </Box>
  )
}
