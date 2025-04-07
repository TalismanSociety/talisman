import { isEthereumAddress } from "@polkadot/util-crypto"
import { Balances } from "@talismn/balances"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Address, getAccountGenesisHash } from "extension-core"
import sortBy from "lodash/sortBy"
import { FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import {
  useAccountByAddress,
  useBalances,
  useChains,
  useChainsMap,
  useEvmNetworksMap,
  useIsBalanceInitializing,
  useSelectedCurrency,
  useSetting,
  useTokenRatesMap,
  useTokens,
} from "@ui/state"
import { isTransferableToken } from "@ui/util/isTransferableToken"

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

type TokenData = {
  id: string
  token: Token
  balances: Balances
  chainNameSearch: string | null | undefined
  chainName: string
  chainLogo: string | null | undefined
  hasFiatRate: boolean
}

const TokenRows: FC<{
  tokens: TokenData[]
  selectedTokenId?: TokenId
  allowUntransferable?: boolean
  onTokenClick: (tokenId: TokenId) => void
}> = ({ tokens, selectedTokenId, allowUntransferable, onTokenClick }) => {
  const refContainer = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tokens.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!tokens.length) return null

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const tokenData = tokens[item.index]
          if (!tokenData) return null

          return (
            <div
              key={item.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <TokenRow
                key={item.key}
                selected={tokenData.token.id === selectedTokenId}
                token={tokenData.token}
                balances={tokenData.balances}
                chainName={tokenData.chainName}
                chainLogo={tokenData.chainLogo}
                hasFiatRate={tokenData.hasFiatRate}
                allowUntransferable={allowUntransferable}
                onClick={() => onTokenClick(tokenData.token.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
  }, [balances, token.decimals])

  const isTransferable = useMemo(() => isTransferableToken(token), [token])

  const currency = useSelectedCurrency()
  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"

  return (
    <button
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
        selected && "bg-grey-800 text-body-secondary",
      )}
    >
      <div className="w-16 shrink-0">
        <TokenLogo tokenId={token.id} className="!text-xl" />
      </div>
      <div className="grow space-y-[5px]">
        <div
          className={classNames(
            "flex w-full justify-between text-sm font-bold",
            selected ? "text-body-secondary" : "text-body",
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
    </button>
  )
}

const DEFAULT_FILTER = () => true

type TokensListProps = {
  address?: Address
  selected?: TokenId
  search?: string
  allowUntransferable?: boolean
  ownedOnly?: boolean
  isRamp?: boolean
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

const TokensList: FC<TokensListProps> = ({
  address,
  selected,
  search,
  allowUntransferable,
  ownedOnly,
  isRamp,
  tokenFilter = DEFAULT_FILTER,
  onSelect,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const [includeTestnets] = useSetting("useTestnets")
  const chains = useChains({ activeOnly: true, includeTestnets })
  const chainsMap = useChainsMap({ activeOnly: true, includeTestnets })
  const evmNetworksMap = useEvmNetworksMap({ activeOnly: true, includeTestnets })
  const allTokens = useTokens({ activeOnly: true, includeTestnets })
  const tokenRatesMap = useTokenRatesMap()
  const formatNetworkName = useFormatNetworkName()
  const isBalancesInitializing = useIsBalanceInitializing()
  const balances = useBalances(ownedOnly ? "owned" : "all")
  const currency = useSelectedCurrency()

  const accountBalances = useMemo(
    () => (address && !selected ? balances.find({ address: address ?? undefined }) : balances),
    [address, selected, balances],
  )

  const accountChain = useMemo(() => {
    const genesisHash = getAccountGenesisHash(account)
    return genesisHash && chains.find((c) => c.genesisHash === genesisHash)
  }, [account, chains])

  const filterAccountCompatibleTokens = useCallback(
    (token: Token) => {
      if (!account || selected) return true
      if (accountChain) return token.chain?.id === accountChain.id

      // substrate accounts can send as long as we have a corresponding chain
      if (!isEthereumAddress(address)) return !!token.chain

      // ethereum ledger account can only sign on evm chain
      if (account.type === "ledger-ethereum") return !!token.evmNetwork

      // non ledger ethereum accounts may also sign on substrate chains (MOVR, GLMR, ..)
      return !!chainsMap[token.chain?.id ?? ""] || !!token.evmNetwork
    },
    [account, accountChain, selected, address, chainsMap],
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

  // sort alphabetically by symbol + chain name
  const sortTokens = useCallback(
    (tokens: TokenData[]): TokenData[] =>
      sortBy(sortBy(tokens, "chainName"), "token.symbol").sort((a, b) => {
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
      }),
    [currency, selected],
  )

  const tokensRamp = useMemo<TokenData[]>(() => {
    // if is not ramp return empty array
    if (!isRamp) return []
    const arAccountBalances = accountBalances.each

    const tokensWithBalance = accountCompatibleTokens.map((t) => ({
      ...t,
      balances: new Balances(arAccountBalances.filter((b) => b.tokenId === t.id)),
    }))

    return sortTokens(tokensWithBalance)
  }, [accountBalances.each, accountCompatibleTokens, isRamp, sortTokens])

  const tokensWithBalances = useMemo<TokenData[]>(() => {
    // wait until balances are loaded, if isRamp return empty array
    if (!accountBalances.count || isRamp) return []

    // the each property spreads the array under the hood, reuse the result to optimize performance for many accounts
    const arAccountBalances = accountBalances.each

    const tokensWithPosBalance = accountCompatibleTokens
      .map((t) => ({
        ...t,
        balances: arAccountBalances.filter((b) => b.tokenId === t.id),
      }))
      .filter((t) => t.balances.some((bal) => bal.transferable.planck > 0n))
      .map((t) => ({
        ...t,
        balances: new Balances(t.balances),
      }))

    return sortTokens(tokensWithPosBalance)
  }, [accountBalances.count, accountBalances.each, isRamp, accountCompatibleTokens, sortTokens])

  // apply user search
  const tokens = useMemo(() => {
    const tokenList = isRamp ? tokensRamp : tokensWithBalances

    if (!search) return tokenList

    const ls = search?.toLowerCase()
    return tokenList
      .filter(
        (t) =>
          !ls ||
          t.token.symbol.toLowerCase().includes(ls) ||
          t.chainNameSearch?.toLowerCase().includes(ls),
      )
      .sort((t1, t2) => {
        const s1 = t1.token.symbol.toLowerCase()
        const s2 = t2.token.symbol.toLowerCase()
        if (s1 === ls && s2 !== ls) return -1
        if (s1 !== ls && s2 === ls) return 1
        return 0
      })
  }, [isRamp, search, tokensRamp, tokensWithBalances])

  const handleTokenClick = useCallback(
    (tokenId: string) => {
      onSelect?.(tokenId)
    },
    [onSelect],
  )

  return (
    <div className="min-h-full">
      {accountBalances.count || (isRamp && tokens.length > 0) ? (
        <>
          <TokenRows
            tokens={tokens}
            selectedTokenId={selected}
            onTokenClick={handleTokenClick}
            allowUntransferable={allowUntransferable}
          />

          {!tokens?.length && (
            <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
              {t("No token matches your search")}
            </div>
          )}
        </>
      ) : isBalancesInitializing ? (
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
      ) : (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          {t("No tokens found")}
        </div>
      )}
    </div>
  )
}

type TokenPickerProps = {
  address?: string
  selected?: TokenId
  initialSearch?: string
  allowUntransferable?: boolean
  ownedOnly?: boolean
  className?: string
  isRamp?: boolean
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

export const TokenPicker: FC<TokenPickerProps> = ({
  address,
  selected,
  initialSearch = "",
  allowUntransferable,
  ownedOnly,
  className,
  isRamp,
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
          allowUntransferable={allowUntransferable}
          ownedOnly={ownedOnly}
          tokenFilter={tokenFilter}
          onSelect={onSelect}
          isRamp={isRamp}
        />
      </ScrollContainer>
    </div>
  )
}
