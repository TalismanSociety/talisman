import { Address } from "@extension/core"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { Balances } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { useTokenRatesMap } from "@ui/hooks/useTokenRatesMap"
import useTokens from "@ui/hooks/useTokens"
import { isTransferableToken } from "@ui/util/isTransferableToken"
import sortBy from "lodash/sortBy"
import { FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useIntersection } from "react-use"

import { useFormatNetworkName } from "../SendFunds/useNetworkDetails"
import { ChainLogoBase } from "./ChainLogo"
import { Fiat } from "./Fiat"
import { TokenLogo } from "./TokenLogo"
import Tokens from "./Tokens"
import { TokenTypePill } from "./TokenTypePill"

type TokenRowProps = {
  token: Token
  selected: boolean
  onClick?: () => void
  balances: Balances
  chainName?: string | null
  chainLogo?: string | null
  hasFiatRate?: boolean
  allowUntransferable?: boolean
}

const TokenRowSkeleton = () => (
  <div className="flex h-[5.8rem] w-full items-center gap-4 px-12 text-left">
    <div className="bg-grey-750 h-16 w-16 animate-pulse rounded-full"></div>
    <div className="grow space-y-[5px]">
      <div className={"text-body flex w-full justify-between text-sm font-bold"}>
        <div>
          <div className="bg-grey-750 rounded-xs inline-block h-7 w-20 animate-pulse"></div>
        </div>
        <div>
          <div className="bg-grey-750 rounded-xs inline-block h-7 w-48 animate-pulse"></div>
        </div>
      </div>
      <div className="text-body-secondary flex w-full items-center justify-between gap-2 text-right text-xs font-light">
        <div>
          <div className="bg-grey-800 rounded-xs inline-block h-6 w-40 animate-pulse"></div>
        </div>
        <div className="grow text-right">
          <div className="bg-grey-800 rounded-xs inline-block h-6 w-28 animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
)

const TokenRow: FC<TokenRowProps> = ({
  token,
  selected,
  balances,
  chainName,
  chainLogo,
  hasFiatRate,
  allowUntransferable,
  onClick,
}) => {
  const { t } = useTranslation()
  const { tokensTotal, isLoading } = useMemo(() => {
    const planck = balances.each.reduce((prev, curr) => prev + curr.transferable.planck, 0n)
    return {
      tokensTotal: planckToTokens(planck.toString(), token.decimals),
      isLoading: balances.each.find((b) => b.status === "cache"),
    }
  }, [balances.each, token.decimals])

  const isTransferable = useMemo(() => isTransferableToken(token), [token])

  // there are more than 250 tokens so we should render only visible tokens to prevent performance issues
  const refButton = useRef<HTMLButtonElement>(null)
  const intersection = useIntersection(refButton, {
    root: null,
    rootMargin: "1000px",
  })

  const currency = useSelectedCurrency()
  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"

  return (
    <button
      ref={refButton}
      disabled={!allowUntransferable && !isTransferable}
      title={
        allowUntransferable || isTransferable
          ? undefined
          : t("Sending this token is not supported yet")
      }
      type="button"
      data-id={token.id}
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected && "bg-grey-800 text-body-secondary"
      )}
    >
      {intersection?.isIntersecting && (
        <>
          <div className="w-16 shrink-0">
            <TokenLogo tokenId={token.id} className="!text-xl" />
          </div>
          <div className="grow space-y-[5px]">
            <div
              className={classNames(
                "flex w-full justify-between text-sm font-bold",
                selected ? "text-body-secondary" : "text-body"
              )}
            >
              <div className="flex items-center">
                <span>{token.symbol}</span>
                <TokenTypePill type={token.type} className="rounded-xs ml-3 px-1 py-0.5" />
                {selected && <CheckCircleIcon className="ml-3 inline align-text-top" />}
              </div>
              <div className={classNames(isLoading && "animate-pulse")}>
                <Tokens
                  amount={tokensTotal}
                  decimals={token.decimals}
                  symbol={isUniswapV2LpToken ? "" : token.symbol}
                  isBalance
                  noCountUp
                />
              </div>
            </div>
            <div className="text-body-secondary flex w-full items-center justify-between gap-2 text-right text-xs font-light">
              <div className="flex flex-col justify-center">
                <ChainLogoBase
                  logo={chainLogo}
                  name={chainName ?? ""}
                  className="inline-block text-sm"
                />
              </div>
              <div>{chainName}</div>
              <div className={classNames("grow", isLoading && "animate-pulse")}>
                {hasFiatRate ? (
                  <Fiat amount={balances.sum.fiat(currency).transferable} isBalance noCountUp />
                ) : (
                  "-"
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </button>
  )
}

const DEFAULT_FILTER = () => true

type TokensListProps = {
  address?: Address
  selected?: TokenId
  search?: string
  showEmptyBalances?: boolean
  allowUntransferable?: boolean
  ownedOnly?: boolean
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

const TokensList: FC<TokensListProps> = ({
  address,
  selected,
  search,
  showEmptyBalances,
  allowUntransferable,
  ownedOnly,
  tokenFilter = DEFAULT_FILTER,
  onSelect,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const [includeTestnets] = useSetting("useTestnets")
  const { chainsMap, chains } = useChains({ activeOnly: true, includeTestnets })
  const { evmNetworksMap } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { tokens: allTokens } = useTokens({ activeOnly: true, includeTestnets })
  const tokenRatesMap = useTokenRatesMap()
  const formatNetworkName = useFormatNetworkName()

  const balances = useBalances(ownedOnly ? "owned" : "all")
  const currency = useSelectedCurrency()

  const accountBalances = useMemo(
    () => (address && !selected ? balances.find({ address: address ?? undefined }) : balances),
    [address, selected, balances]
  )

  const accountChain = useMemo(
    () => account?.genesisHash && chains.find((c) => c.genesisHash === account?.genesisHash),
    [account?.genesisHash, chains]
  )

  const filterAccountCompatibleTokens = useCallback(
    (token: Token) => {
      if (!account || selected) return true
      if (accountChain) return token.chain?.id === accountChain.id

      // substrate accounts can send as long as we have a corresponding chain
      if (!isEthereumAddress(address)) return !!token.chain

      // ethereum ledger account can only sign on evm chain
      if (account.isHardware) return !!token.evmNetwork

      // non ledger ethereum accounts may also sign on substrate chains (MOVR, GLMR, ..)
      return !!chainsMap[token.chain?.id ?? ""] || !!token.evmNetwork
    },
    [account, accountChain, selected, address, chainsMap]
  )

  const accountCompatibleTokens = useMemo(() => {
    return allTokens
      .filter(tokenFilter)
      .filter(filterAccountCompatibleTokens)
      .filter(isTransferableToken)
      .map((token) => {
        const chain = token.chain && chainsMap[token.chain.id]
        const evmNetwork = token.evmNetwork && evmNetworksMap[token.evmNetwork.id]
        return {
          id: token.id,
          token,
          chainNameSearch: chain?.name ?? evmNetwork?.name,
          chainName: formatNetworkName(chain ?? undefined, evmNetwork ?? undefined),
          chainLogo: chain?.logo ?? evmNetwork?.logo,
          hasFiatRate: !!tokenRatesMap[token.id],
        }
      })
  }, [
    allTokens,
    chainsMap,
    evmNetworksMap,
    filterAccountCompatibleTokens,
    formatNetworkName,
    tokenFilter,
    tokenRatesMap,
  ])

  const tokensWithBalances = useMemo(() => {
    // wait until balances are loaded
    if (!accountBalances.count) return []

    // the each property spreads the array under the hood, reuse the result to optimize performance for many accounts
    const arAccountBalances = accountBalances.each

    const tokensWithPosBalance = accountCompatibleTokens
      .map((t) => ({
        ...t,
        balances: arAccountBalances.filter((b) => b.tokenId === t.id),
      }))
      .filter((t) => showEmptyBalances || t.balances.some((bal) => bal.transferable.planck > 0n))
      .map((t) => ({
        ...t,
        balances: new Balances(t.balances),
      }))

    // sort alphabetically by symbol + chain name
    const results = sortBy(sortBy(tokensWithPosBalance, "chainName"), "token.symbol").sort(
      (a, b) => {
        // transferable tokens first
        const isTransferableA = isTransferableToken(a.token)
        const isTransferableB = isTransferableToken(b.token)
        if (isTransferableA && !isTransferableB) return -1
        if (!isTransferableA && isTransferableB) return 1

        // selected token first
        if (a.id === selected) return -1
        if (b.id === selected) return 1

        // sort by fiat balance
        const aFiat = a.balances.sum.fiat(currency).transferable
        const bFiat = b.balances.sum.fiat(currency).transferable
        if (aFiat > bFiat) return -1
        if (aFiat < bFiat) return 1

        // sort by "has a balance or not" (values don't matter)
        const aHasBalance = !!a.balances.each.find((bal) => bal.transferable.planck > 0n)
        const bHasBalance = !!b.balances.each.find((bal) => bal.transferable.planck > 0n)
        if (aHasBalance && !bHasBalance) return -1
        if (!aHasBalance && bHasBalance) return 1

        // polkadot and kusama should appear first
        if (a.token.id === "polkadot-substrate-native") return -1
        if (b.token.id === "polkadot-substrate-native") return 1
        if (a.token.id === "kusama-substrate-native") return -1
        if (b.token.id === "kusama-substrate-native") return 1

        // keep alphabetical sort
        return 0
      }
    )

    return results
  }, [accountBalances, accountCompatibleTokens, showEmptyBalances, selected, currency])

  // apply user search
  const tokens = useMemo(() => {
    const ls = search?.toLowerCase()
    return tokensWithBalances.filter(
      (t) =>
        !ls ||
        t.token.symbol.toLowerCase().includes(ls) ||
        t.chainNameSearch?.toLowerCase().includes(ls)
    )
  }, [search, tokensWithBalances])

  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  return (
    <div className="min-h-full">
      {accountBalances.count ? (
        <>
          {tokens?.map(({ token, balances, chainName, chainLogo, hasFiatRate }) => (
            <TokenRow
              key={token.id}
              selected={token.id === selected}
              token={token}
              balances={balances}
              chainName={chainName}
              chainLogo={chainLogo}
              hasFiatRate={hasFiatRate}
              allowUntransferable={allowUntransferable}
              onClick={handleAccountClick(token.id)}
            />
          ))}
          {!tokens?.length && (
            <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
              {t("No token matches your search")}
            </div>
          )}
        </>
      ) : (
        <>
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
          <TokenRowSkeleton />
        </>
      )}
    </div>
  )
}

type TokenPickerProps = {
  address?: string
  selected?: TokenId
  initialSearch?: string
  showEmptyBalances?: boolean
  allowUntransferable?: boolean
  ownedOnly?: boolean
  className?: string
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

export const TokenPicker: FC<TokenPickerProps> = ({
  address,
  selected,
  initialSearch = "",
  showEmptyBalances,
  allowUntransferable,
  ownedOnly,
  className,
  tokenFilter,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState(initialSearch)
  const deferredSearch = useDeferredValue(search)

  return (
    <div
      className={classNames("flex h-full min-h-full w-full flex-col overflow-hidden", className)}
    >
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <SearchInput
          onChange={setSearch}
          placeholder={t("Search by token or network name")}
          initialValue={initialSearch}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={!initialSearch}
        />
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <TokensList
          address={address}
          selected={selected}
          search={deferredSearch}
          showEmptyBalances={showEmptyBalances}
          allowUntransferable={allowUntransferable}
          ownedOnly={ownedOnly}
          tokenFilter={tokenFilter}
          onSelect={onSelect}
        />
      </ScrollContainer>
    </div>
  )
}
