import { Chain, EvmNetwork, Token } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { range } from "lodash"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useChainsMap, useEvmNetworksMap } from "@ui/state"

import { TokenLogo } from "../TokenLogo"
import { RampLayout } from "./RampLayout"

type TokenDisplay = Token & {
  network: Chain | EvmNetwork
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

  const tokensWithNetwork = useMemo<TokenDisplay[] | undefined>(
    () =>
      tokens
        ?.map((t) => ({
          ...t,
          network: evmNetworksMap[t.evmNetwork?.id ?? ""] ?? dotNetworksMap[t.chain?.id ?? ""],
        }))
        .filter((t) => !!t.network),
    [dotNetworksMap, evmNetworksMap, tokens],
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
    return sortedTokens?.filter(
      // TODO search also network name
      // sort with exact matches up top
      (currency) => currency.symbol.toLowerCase().includes(ls),
      // currency.network.name?.toLowerCase().includes(ls),
    )
  }, [search, sortedTokens])

  return (
    <RampLayout onBackClick={onClose} title={t("Select a token")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder={t("Search")} />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {!tokens && range(0, 10).map((i) => <TokenButtonRowSkeleton key={i} />)}
          {filteredTokens?.map((token) => (
            <TokenButtonRow
              token={token}
              key={token.id}
              onClick={() => onSelect(token.id)}
              selected={selected === token.id}
            />
          ))}
        </ScrollContainer>
      </div>
    </RampLayout>
  )
}

const TokenButtonRow: FC<{
  token: TokenDisplay
  onClick: () => void
  selected: boolean
}> = ({ token, selected, onClick }) => {
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
      <div className="flex items-center gap-8">
        <div className="size-16 shrink-0">
          <TokenLogo tokenId={token.id} className="size-16 shrink-0" />
        </div>
        <div className="min-w-0 text-[16px]">
          <div className="flex items-center">
            <div className="text-white">{token.symbol}</div>
            {selected && <CheckCircleIcon className="ml-3 inline shrink-0" />}
          </div>
          <div className="text-tiny truncate">{token.network.name}</div>
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
