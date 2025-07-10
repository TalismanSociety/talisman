import { Network, Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { TokenRates, TokenRatesList } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { range } from "lodash-es"
import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenCloseStatus } from "talisman-ui"

import { ScrollContainer, useScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworksMapById, useRemoteConfig, useSelectedCurrency } from "@ui/state"

import { RampsPickerLayout } from "./RampsPickerLayout"

type TokenDisplay = Token & {
  network: Network
  rates?: TokenRates
}

export const RampsTokenPicker: FC<{
  /** if undefined, component assumes currencies are loading */
  tokens: Token[] | undefined
  tokenRates: TokenRatesList | undefined | null
  selected?: string
  onSelect: (tokenId: string) => void
  onClose: () => void
}> = ({ tokens, tokenRates, selected, onClose, onSelect }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const remoteConfig = useRemoteConfig()

  const networksMap = useNetworksMapById()

  const tokensWithNetwork = useMemo<TokenDisplay[] | undefined>(
    () =>
      tokens
        ?.map((t) => ({
          ...t,
          network: networksMap[t.networkId],
          rates: tokenRates?.[t.id],
        }))
        .filter((t) => !!t.network),
    [tokens, networksMap, tokenRates],
  )

  const sortedTokens = useMemo(
    () =>
      tokensWithNetwork?.concat().sort((t1, t2) => {
        if (t1.id === selected) return -1
        if (t2.id === selected) return 1

        const isPinnedT1 = remoteConfig.ramps.pinnedTokens.includes(t1.id)
        const isPinnedT2 = remoteConfig.ramps.pinnedTokens.includes(t2.id)
        if (isPinnedT1 && !isPinnedT2) return -1
        if (!isPinnedT1 && isPinnedT2) return 1

        return t1.symbol === t2.symbol
          ? (t1.network.name ?? "").localeCompare(t2.network.name ?? "")
          : t1.symbol.localeCompare(t2.symbol)
      }),
    [remoteConfig, selected, tokensWithNetwork],
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

  // once drawer is open, focus on the search input
  const refSearchInput = useRef<HTMLInputElement>(null)
  const transitionStatus = useOpenCloseStatus()
  useEffect(() => {
    if (transitionStatus === "open") refSearchInput.current?.focus()
  }, [transitionStatus])

  return (
    <RampsPickerLayout onBackClick={onClose} title={t("Select a token")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput ref={refSearchInput} onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer
          ref={refContainer}
          className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t"
        >
          {!filteredTokens ? (
            range(0, 10).map((i) => <TokenButtonRowSkeleton key={i} />)
          ) : (
            <TokensList tokens={filteredTokens} onSelect={onSelect} selected={selected} />
          )}
        </ScrollContainer>
      </div>
    </RampsPickerLayout>
  )
}

const TokensList: FC<{
  tokens: TokenDisplay[]
  selected?: string
  onSelect: (tokenId: string) => void
}> = ({ tokens, selected, onSelect }) => {
  const { t } = useTranslation()
  const { ref: refContainer } = useScrollContainer()

  const virtualizer = useVirtualizer({
    count: tokens.length,
    estimateSize: () => 58,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  if (!tokens.length)
    return (
      <div className="text-body-secondary p-12 text-center text-base">
        {t("No tokens match your search")}
      </div>
    )

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
        <div className="flex min-w-0 grow flex-col gap-1 text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{token.symbol}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden truncate text-xs">
            <NetworkLogo networkId={token.networkId} className="inline-block shrink-0" />
            <div className="text-body-secondary grow truncate">{token.network.name}</div>
          </div>
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
