import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Address } from "@core/types/base"
import { Balances } from "@talismn/balances"
import { subNativeTokenId, type Token, type TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { OptionSwitch } from "@ui/components/OptionSwitch"
import { ScrollContainer, useScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalances, useIsBalanceInitializing } from "@ui/state/balances"
import { useNetworksMapById, useTokens } from "@ui/state/chaindata"
import { useSelectedCurrency } from "@ui/state/settings"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { isTransferableToken } from "@ui/util/isTransferableToken"
import sortBy from "lodash-es/sortBy"
import { type FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { NetworkName } from "../Networks/NetworkName"
import { BittensorValidatorName } from "../Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { Fiat } from "./Fiat"
import { TokenLogo } from "./TokenLogo"
import { Tokens } from "./Tokens"
import { TokenTypePill } from "./TokenTypePill"

type TokenRowProps = {
  token: Token
  selected: boolean
  onClick?: () => void
  balances: Balances
  allowUntransferable?: boolean
}

const TokenRowSkeleton = () => (
  <div className="flex h-[5.8rem] w-full items-center gap-4 px-12 text-left">
    <div className="h-16 w-16 animate-pulse rounded-full bg-grey-750"></div>
    <div className="grow space-y-[5px]">
      <div className={"flex w-full justify-between font-bold text-body text-sm"}>
        <div>
          <div className="inline-block h-7 w-20 animate-pulse rounded-xs bg-grey-750"></div>
        </div>
        <div>
          <div className="inline-block h-7 w-48 animate-pulse rounded-xs bg-grey-750"></div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-2 text-right font-light text-body-secondary text-xs">
        <div>
          <div className="inline-block h-6 w-40 animate-pulse rounded-xs bg-grey-800"></div>
        </div>
        <div className="grow text-right">
          <div className="inline-block h-6 w-28 animate-pulse rounded-xs bg-grey-800"></div>
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
}

const TokenRows: FC<{
  tokens: TokenData[]
  selectedTokenId?: TokenId
  allowUntransferable?: boolean
  onTokenClick: (tokenId: TokenId) => void
}> = ({ tokens, selectedTokenId, allowUntransferable, onTokenClick }) => {
  const { ref: refContainer } = useScrollContainer()
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
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
              data-testid="token-picker-row"
            >
              <TokenRow
                key={item.key}
                selected={tokenData.token.id === selectedTokenId}
                token={tokenData.token}
                balances={tokenData.balances}
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
  const hasFiatRate = useMemo(() => balances.each.some((b) => b.rates), [balances])

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
        "flex h-[5.8rem] w-full items-center gap-4 overflow-hidden px-12 text-left hover:bg-grey-750 focus:bg-grey-700",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected && "bg-grey-800 text-body-secondary"
      )}
    >
      <div className="w-16 shrink-0">
        <TokenLogo tokenId={token.id} className="!text-xl" />
      </div>
      <div className="flex grow flex-col gap-2.5 overflow-hidden">
        <div
          className={classNames(
            "flex w-full justify-between gap-6 overflow-hidden font-bold text-sm",
            selected ? "text-body-secondary" : "text-body"
          )}
        >
          <div className="flex grow items-center gap-2 overflow-hidden">
            <div data-testid="picker-token-name">{token.symbol}</div>
            <TokenTypePill type={token.type} className="shrink-0 rounded-xs px-1 py-0.5" />
            {!!token.name && token.name !== token.symbol && (
              <div className="truncate font-normal text-body-inactive">{token.name}</div>
            )}
            {selected && <CheckCircleIcon className="inline shrink-0 align-text-top" />}
          </div>
          <div className={classNames(isLoading && "animate-pulse")}>
            <Tokens
              amount={tokensTotal}
              decimals={token.decimals}
              symbol={isUniswapV2LpToken ? "" : token.symbol}
              isBalance
              noCountUp
              className="text-nowrap"
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-between gap-6 overflow-hidden text-right font-light text-body-secondary text-xs">
          <div className="flex grow items-center overflow-hidden">
            <div className="truncate" data-testid="picker-token-network">
              <NetworkLogo networkId={token.networkId} className="mr-2 inline-block text-sm" />
              <NetworkName networkId={token.networkId} />
              {token.type === "substrate-dtao" && (
                <BittensorValidatorName hotkey={token.hotkey} prefix=" | " />
              )}
            </div>
          </div>
          <div className={classNames(isLoading && "animate-pulse")}>
            {hasFiatRate ? (
              <Fiat
                amount={balances.sum.fiat(currency).transferable}
                isBalance
                noCountUp
                className="text-nowrap"
              />
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
  activeOnly?: boolean
  showEmptyBalances?: boolean
  isInitializing?: boolean
  /** these tokens will always be sorted to the top of the list */
  priorityTokens?: (token: Token) => boolean
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

const TokensList: FC<TokensListProps> = ({
  address,
  selected,
  search,
  allowUntransferable,
  ownedOnly,
  activeOnly = true,
  showEmptyBalances,
  isInitializing,
  priorityTokens,
  tokenFilter = DEFAULT_FILTER,
  onSelect,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const allTokens = useTokens({ activeOnly, includeTestnets: true })
  const tokenRatesMap = useTokenRatesMap()
  const networksMap = useNetworksMapById()

  const isBalancesInitializing = useIsBalanceInitializing()
  const balances = useBalances(ownedOnly ? "owned" : "all")
  const currency = useSelectedCurrency()

  // Capture the selected token at mount time so the sort order stays stable.
  // When the modal re-opens, the component remounts and picks up the new value.
  const initialSelectedRef = useRef(selected)

  const accountBalances = useMemo(
    () => (address && !selected ? balances.find({ address: address ?? undefined }) : balances),
    [address, selected, balances]
  )

  const filterAccountCompatibleTokens = useCallback(
    (token: Token) => {
      const network = networksMap[token.networkId]
      if (!network) return false
      if (!account) return true

      return isAccountCompatibleWithNetwork(network, account)
    },
    [account, networksMap]
  )

  const accountCompatibleTokens = useMemo(() => {
    return allTokens
      .filter(tokenFilter)
      .filter(filterAccountCompatibleTokens)
      .filter(isTransferableToken)
      .map((token) => {
        const network = networksMap[token.networkId]
        return {
          id: token.id,
          token,
          chainNameSearch: network?.name,
          chainLogo: network?.logo,
          hasFiatRate: !!tokenRatesMap[token.id],
        }
      })
  }, [allTokens, filterAccountCompatibleTokens, networksMap, tokenFilter, tokenRatesMap])

  // sort by token balance
  const sortTokens = useCallback(
    (tokens: TokenData[]): TokenData[] =>
      sortBy(sortBy(tokens, "chainName"), "token.symbol").sort((a, b) => {
        // priority tokens first
        const isPriorityA = priorityTokens?.(a.token) ?? false
        const isPriorityB = priorityTokens?.(b.token) ?? false
        if (isPriorityA && !isPriorityB) return -1
        if (!isPriorityA && isPriorityB) return 1

        // transferable tokens first
        const isTransferableA = isTransferableToken(a.token)
        const isTransferableB = isTransferableToken(b.token)
        if (isTransferableA && !isTransferableB) return -1
        if (!isTransferableA && isTransferableB) return 1

        // Pin the initially-selected token to the top — but don't re-sort
        // when the selection changes, so the list stays visually stable.
        if (a.id === initialSelectedRef.current) return -1
        if (b.id === initialSelectedRef.current) return 1

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
        if (a.token.id === subNativeTokenId("polkadot")) return -1
        if (b.token.id === subNativeTokenId("polkadot")) return 1
        if (a.token.id === subNativeTokenId("kusama")) return -1
        if (b.token.id === subNativeTokenId("kusama")) return 1

        // keep alphabetical sort
        return 0
      }),
    [currency, priorityTokens]
  )

  const tokensWithBalances = useMemo<TokenData[]>(() => {
    // wait until balances are loaded, unless showEmptyBalances is true
    if (!showEmptyBalances && !accountBalances.count) return []

    // the each property spreads the array under the hood, reuse the result to optimize performance for many accounts
    const accountBalancesEach = accountBalances.each

    const tokensWithPosBalance = accountCompatibleTokens.map((t) => ({
      ...t,
      balances: new Balances(accountBalancesEach.filter((b) => b.tokenId === t.id)),
    }))

    if (showEmptyBalances) return sortTokens(tokensWithPosBalance)
    return sortTokens(tokensWithPosBalance.filter((t) => t.balances.sum.planck.transferable > 0n))
  }, [
    accountBalances.count,
    accountBalances.each,
    showEmptyBalances,
    accountCompatibleTokens,
    sortTokens,
  ])

  // apply user search
  const tokens = useMemo(() => {
    if (!search) return tokensWithBalances

    const ls = search?.toLowerCase()
    return tokensWithBalances
      .filter(
        (t) =>
          !ls || [t.token.symbol, t.token.name, t.chainNameSearch].join().toLowerCase().includes(ls)
      )
      .sort((t1, t2) => {
        const s1 = t1.token.symbol.toLowerCase()
        const s2 = t2.token.symbol.toLowerCase()
        if (s1 === ls && s2 !== ls) return -1
        if (s1 !== ls && s2 === ls) return 1
        return 0
      })
  }, [search, tokensWithBalances])

  const handleTokenClick = useCallback(
    (tokenId: string) => {
      onSelect?.(tokenId)
    },
    [onSelect]
  )

  return (
    <div className="min-h-full">
      {(accountBalances.count || (showEmptyBalances && tokens.length > 0)) && !isInitializing ? (
        <>
          <TokenRows
            tokens={tokens}
            selectedTokenId={selected}
            onTokenClick={handleTokenClick}
            allowUntransferable={allowUntransferable}
          />

          {!tokens?.length && (
            <div className="flex h-[5.8rem] w-full items-center px-12 text-left text-body-secondary">
              {t("No token matches your search")}
            </div>
          )}
        </>
      ) : isBalancesInitializing || isInitializing ? (
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
        <div className="flex h-[5.8rem] w-full items-center px-12 text-left text-body-secondary">
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
  isInitializing?: boolean
  className?: string
  showEmptyBalances?: boolean
  /** these tokens will always be sorted to the top of the list */
  priorityTokens?: (token: Token) => boolean
  tokenFilter?: (token: Token) => boolean
  tokenFilterOptions?: Array<[string, string]>
  tokenFilterDefaultOption?: string
  onTokenFilterOptionChange?: (option: string) => void
  onSelect?: (tokenId: TokenId) => void
}

export const TokenPicker: FC<TokenPickerProps> = ({
  address,
  selected,
  initialSearch = "",
  allowUntransferable,
  ownedOnly,
  isInitializing,
  className,
  showEmptyBalances,
  priorityTokens,
  tokenFilter,
  tokenFilterOptions,
  tokenFilterDefaultOption,
  onTokenFilterOptionChange,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState(initialSearch)
  const deferredSearch = useDeferredValue(search)

  return (
    <div
      className={classNames("flex h-full min-h-full w-full flex-col overflow-hidden", className)}
    >
      <div className="flex min-h-fit w-full flex-col items-center gap-2 px-12 pb-8">
        <SearchInput
          onChange={setSearch}
          placeholder={t("Search by token or network name")}
          initialValue={initialSearch}
          autoFocus={!initialSearch}
        />
        {tokenFilterOptions !== undefined && (
          <div className="no-scrollbar max-w-full overflow-x-scroll">
            <OptionSwitch
              className="text-xs"
              optionButtonClassName="px-3"
              options={tokenFilterOptions}
              defaultOption={tokenFilterDefaultOption}
              onChange={onTokenFilterOptionChange}
            />
          </div>
        )}
      </div>
      <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
        <TokensList
          address={address}
          selected={selected}
          search={deferredSearch}
          allowUntransferable={allowUntransferable}
          ownedOnly={ownedOnly}
          isInitializing={isInitializing}
          priorityTokens={priorityTokens}
          tokenFilter={tokenFilter}
          onSelect={onSelect}
          showEmptyBalances={showEmptyBalances}
          activeOnly={!showEmptyBalances}
        />
      </ScrollContainer>
    </div>
  )
}
