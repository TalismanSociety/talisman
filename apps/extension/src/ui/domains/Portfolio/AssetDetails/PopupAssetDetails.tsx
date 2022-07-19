import { BalanceFormatter, Balances, LockedBalance } from "@core/domains/balances/types"
import { encodeAnyAddress, planckToTokens } from "@core/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { IconButton } from "@talisman/components/IconButton"
import { useNotification } from "@talisman/components/Notification"
import { CopyIcon, LoaderIcon, LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { shortenAddress } from "@talisman/util/shortenAddress"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/hooks/useTokenBalancesSummary"
import { Fragment, useCallback, useMemo } from "react"
import styled from "styled-components"

import StyledAssetLogo from "../../Asset/Logo"
import { NoTokensMessage } from "../NoTokensMessage"
import { getBalanceLockTypeTitle } from "./getBalanceLockTypeTitle"
import { useAssetDetails } from "./useAssetDetails"

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
  font-size: 1em;
  line-height: 1;
  margin-left: 0.4rem;
`

type AssetRowProps = {
  balances: Balances
  symbol: string
  locks?: LockedBalance[]
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

const ChainTokenBalances = ({ balances, symbol, locks = [] }: AssetRowProps) => {
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
        : [],
    [locks, summary, token?.decimals, token?.rates]
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
      <Box
        flex
        fullwidth
        bg="background-muted-3x"
        border="transparent"
        gap={1.2}
        padding="1.2rem 1.4rem"
      >
        <Box fontsize="xlarge">
          <StyledAssetLogo id={evmNetwork?.substrateChain?.id ?? chainOrNetwork.id} />
        </Box>
        <Box grow flex column justify="center" gap={0.4} padding="0 1.6rem 0 0">
          <Box flex justify="space-between" bold fg="foreground">
            <Box flex align="center" gap={0.8}>
              {chainOrNetwork.name} <CopyAddressButton prefix={chain?.prefix} />{" "}
              {isFetching && <FetchingIndicator data-spin />}
            </Box>
          </Box>
          <Box flex justify="space-between" fontsize="xsmall" fg="mid">
            <Box>{networkType}</Box>
          </Box>
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
            padding="1.2rem 1.4rem"
          >
            <Box grow fg="foreground" bold>
              {row.title}
            </Box>
            <Box flex column justify="center" gap={0.4} textalign="right">
              <Box bold fg={row.locked ? "mid" : "foreground"}>
                <Tokens
                  amount={planckToTokens(row.tokens.toString(), token.decimals)}
                  symbol={token?.symbol}
                  isBalance
                />
                {row.locked ? (
                  <>
                    {" "}
                    <LockIcon className="lock" />
                  </>
                ) : null}
              </Box>
              <Box fontsize="xsmall">
                {row.fiat === null ? "-" : <Fiat currency="usd" amount={row.fiat} isBalance />}
              </Box>
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
  const { balancesByChain, lockedByChain, isLoading } = useAssetDetails(balances)

  const rows = Object.entries(balancesByChain)
  if (!rows.length) return isLoading ? null : <NoTokensMessage symbol={symbol} />

  return (
    <FadeIn>
      <Box flex column gap={1.6}>
        {rows.map(([key, bal], i, rows) => (
          <ChainTokenBalances key={key} symbol={symbol} balances={bal} locks={lockedByChain[key]} />
        ))}
      </Box>
    </FadeIn>
  )
}
