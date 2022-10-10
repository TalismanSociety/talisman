import { Balances } from "@core/domains/balances/types"
import { encodeAnyAddress, planckToTokens } from "@core/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { IconButton } from "@talisman/components/IconButton"
import { CopyIcon, CreditCardIcon, LoaderIcon, LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { api } from "@ui/api"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback, useMemo } from "react"
import styled from "styled-components"
import { PillButton } from "talisman-ui"

import StyledAssetLogo from "../../Asset/Logo"
import { PortfolioAccount } from "./PortfolioAccount"
import { useAssetDetails } from "./useAssetDetails"
import { useChainTokenBalances } from "./useChainTokenBalances"

const SmallIconButton = styled(IconButton)`
  height: 1.2rem;
  width: 1.2rem;
  font-size: var(--font-size-xsmall);
`

const CopyAddressButton = ({ prefix }: { prefix: number | null | undefined }) => {
  const { account } = useSelectedAccount()

  const address = useMemo(() => {
    if (!account) return null
    if (isEthereumAddress(account.address)) return account.address
    return encodeAnyAddress(account.address, prefix ?? undefined)
  }, [account, prefix])

  const handleClick = useCallback(() => {
    if (!address) return
    copyAddress(address)
  }, [address])

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
  chainId: string | number
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

const ChainTokenBalances = ({ chainId, balances, symbol }: AssetRowProps) => {
  const { chainOrNetwork, summary, token, detailRows, evmNetwork, chain, isFetching, networkType } =
    useChainTokenBalances({ chainId, balances, symbol })

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
            <Box grow flex column justify="center" gap={0.4} overflow="hidden">
              <Box fg="foreground" bold>
                {row.title}
              </Box>
              {!!row.address && (
                <Box fontsize="xsmall">
                  <PortfolioAccount address={row.address} />
                </Box>
              )}
            </Box>
            <Box flex column justify="center" gap={0.4} textalign="right" noWrap>
              <Box bold fg={row.locked ? "mid" : "foreground"}>
                <Tokens
                  amount={planckToTokens(row.tokens.toString(), token.decimals)}
                  symbol={token?.symbol}
                  isBalance
                />
                {row.locked ? (
                  <>
                    {" "}
                    <LockIcon className="lock inline align-baseline" />
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

const NoTokens = ({ symbol }: { symbol: string }) => {
  const { account } = useSelectedAccount()
  const { open } = useAddressFormatterModal()

  const handleCopy = useCallback(() => {
    if (account?.address) open(account.address)
  }, [account?.address, open])

  const showBuyCrypto = useIsFeatureEnabled("BUY_CRYPTO")
  const handleBuyCryptoClick = useCallback(async () => {
    await api.modalOpen("buy")
    window.close()
  }, [])

  return (
    <FadeIn>
      <div className="bg-field text-body-secondary leading-base rounded-sm p-10 text-center text-sm">
        <div>
          You don't have any {symbol} {account ? " in this account" : ""}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          {!!account && (
            <PillButton icon={CopyIcon} onClick={handleCopy}>
              Copy Address
            </PillButton>
          )}
          {showBuyCrypto && (
            <PillButton icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
              Buy Crypto
            </PillButton>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

export const PopupAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain, isLoading } = useAssetDetails(balances)
  const rows = useMemo(() => Object.entries(balancesByChain), [balancesByChain])
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.sorted.some((b) => b.total.planck > BigInt(0))),
    [rows]
  )

  if (!hasBalance) return isLoading ? null : <NoTokens symbol={symbol} />

  return (
    <FadeIn>
      <Box flex column gap={1.6}>
        {rows.map(([chainId, bal]) => (
          <ChainTokenBalances key={chainId} chainId={chainId} symbol={symbol} balances={bal} />
        ))}
      </Box>
    </FadeIn>
  )
}
