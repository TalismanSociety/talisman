import { Chain, EvmNetwork, Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { fetchTokenRates, TokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useVirtualizer } from "@tanstack/react-virtual"
import { keyBy, range } from "lodash"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useChainsMap, useEvmNetworksMap, useSelectedCurrency } from "@ui/state"

import { Fiat } from "../Fiat"
import { TokenLogo } from "../TokenLogo"
import { RampLayout } from "./RampLayout"

type TokenDisplay = Token & {
  network: Chain | EvmNetwork
  rates?: TokenRates
}

export const RampTokenPicker: FC<{
  /** if undefined, component assumes currencies are loading */
  tokens: Token[] | undefined
  selected?: string
  onSelect: (tokenId: string) => void
  onClose: () => void
}> = ({ tokens, selected, onClose, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const evmNetworksMap = useEvmNetworksMap()
  const dotNetworksMap = useChainsMap()

  const { data: allTokenRates } = useSpecificTokenRates(tokens)

  const tokensWithNetwork = useMemo<TokenDisplay[] | undefined>(
    () =>
      tokens
        ?.map((t) => ({
          ...t,
          network: evmNetworksMap[t.evmNetwork?.id ?? ""] ?? dotNetworksMap[t.chain?.id ?? ""],
          rates: allTokenRates?.[t.id],
        }))
        .filter((t) => !!t.network),
    [allTokenRates, dotNetworksMap, evmNetworksMap, tokens],
  )

  const sortedTokens = useMemo(
    () =>
      tokensWithNetwork?.concat().sort((t1, t2) => {
        if (t1.id === selected) return -1
        if (t2.id === selected) return 1

        return t1.symbol.localeCompare(t2.symbol)
      }),
    [selected, tokensWithNetwork],
  )

  const filteredTokens = useMemo(() => {
    const ls = search.toLowerCase()
    return sortedTokens
      ?.filter((currency) => currency.symbol.toLowerCase().includes(ls))
      .sort((t1, t2) => {
        // exact matches first
        if (t1.symbol.toLowerCase() === ls) return -1
        if (t2.symbol.toLowerCase() === ls) return 1
        return 0
      })
  }, [search, sortedTokens])

  // scroll to top on search change
  const refContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!refContainer.current) return
    refContainer.current.scrollTo(0, 0)
  }, [search, filteredTokens])

  return (
    <RampLayout onBackClick={onClose} title={t("Select a token")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer
          ref={refContainer}
          className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t"
        >
          {!filteredTokens && range(0, 10).map((i) => <TokenButtonRowSkeleton key={i} />)}
          {!!filteredTokens && (
            <TokensList tokens={filteredTokens} onSelect={onSelect} selected={selected} />
          )}
        </ScrollContainer>
      </div>
    </RampLayout>
  )
}

const TokensList: FC<{
  tokens: TokenDisplay[]
  selected?: string
  onSelect: (tokenId: string) => void
}> = ({ tokens, selected, onSelect }) => {
  const refContainer = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: tokens.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!tokens.length) return null

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const token = tokens[item.index]
          if (!token) return null

          return (
            <div
              key={item.key}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <TokenButtonRow
                key={item.key}
                selected={token.id === selected}
                token={token}
                onClick={() => onSelect(token.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const TokenButtonRow: FC<{
  token: TokenDisplay
  onClick: () => void
  selected: boolean
}> = ({ token, selected, onClick }) => {
  const selectedCurrency = useSelectedCurrency()

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={0}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
      )}
    >
      <div className="flex w-full items-center gap-8 overflow-hidden">
        <div className="size-16 shrink-0">
          <TokenLogo tokenId={token.id} className="size-16 shrink-0" />
        </div>
        <div className="min-w-0 grow text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{token.symbol}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="text-tiny truncate">{token.network.name}</div>
        </div>
        <div className="text-body-secondary truncate text-sm">
          <Fiat amount={token.rates?.[selectedCurrency]?.price} noCountUp />
        </div>
      </div>
    </button>
  )
}

const TokenButtonRowSkeleton: FC = () => {
  return (
    <div className="flex h-[5.8rem] w-full select-none items-center gap-4 px-12 text-left">
      <div className="flex items-center gap-8">
        <div className="flex-shrink-0">
          <div className="bg-grey-750 size-16 animate-pulse rounded-full"></div>
        </div>
        <div className="min-w-0 space-y-2 text-[16px]">
          <div className="flex items-center">
            <div className="bg-grey-750 text-grey-750 rounded-xs animate-pulse">XXX</div>
          </div>
          <div className="text-tiny bg-grey-750 text-grey-750 rounded-xs animate-pulse">
            XXXXXXXX XXXXXX
          </div>
        </div>
      </div>
    </div>
  )
}

const useSpecificTokenRates = (tokens: Token[] | undefined) => {
  const selectedCurrency = useSelectedCurrency()

  return useQuery({
    queryKey: ["useSpecificTokenRates", tokens?.map((t) => t.id).join("::")],
    queryFn: () => {
      if (!tokens?.length) return null
      const tokensMap = keyBy(tokens, (t) => t.id)
      return fetchTokenRates(tokensMap, [selectedCurrency])
    },
    enabled: !!tokens,
    refetchOnWindowFocus: false,
  })
}
