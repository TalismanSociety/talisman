import { isEthereumAddress } from "@polkadot/util-crypto"
import { Token, TokenId } from "@talismn/chaindata-provider"
import { CheckCircleIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useDeferredValue, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useIntersection } from "react-use"

import { Address } from "@extension/core"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import {
  useAccountByAddress,
  useChains,
  useChainsMap,
  useEvmNetworksMap,
  useSetting,
  useTokenRatesMap,
  useTokens,
} from "@ui/state"

import { useFormatNetworkName } from "../../SendFunds/useNetworkDetails"
import { ChainLogoBase } from "../ChainLogo"
import { TokenLogo } from "../TokenLogo"
import { TokenTypePill } from "../TokenTypePill"

type TokenRowProps = {
  token: Token
  selected: boolean
  onClick?: () => void
  chainName?: string | null
  chainLogo?: string | null
  hasFiatRate?: boolean
}

const TokenRow: FC<TokenRowProps> = ({ token, selected, chainName, chainLogo, onClick }) => {
  // there are more than 250 tokens so we should render only visible tokens to prevent performance issues
  const refButton = useRef<HTMLButtonElement>(null)
  const intersection = useIntersection(refButton, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <button
      ref={refButton}
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
      {intersection?.isIntersecting && (
        <>
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
            </div>
            <div className="text-body-secondary flex w-full items-center gap-2 text-right text-xs font-light">
              <div className="flex flex-col justify-center">
                <ChainLogoBase
                  logo={chainLogo}
                  name={chainName ?? ""}
                  className="inline-block text-sm"
                />
              </div>
              <div>{chainName}</div>
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
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

const TokensList: FC<TokensListProps> = ({
  address,
  selected,
  search,
  tokenFilter = DEFAULT_FILTER,
  onSelect,
}) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const [includeTestnets] = useSetting("useTestnets")
  const chains = useChains({ activeOnly: false, includeTestnets })
  const chainsMap = useChainsMap({ activeOnly: false, includeTestnets })
  const evmNetworksMap = useEvmNetworksMap({ activeOnly: false, includeTestnets })
  const allTokens = useTokens({ activeOnly: false, includeTestnets })
  const tokenRatesMap = useTokenRatesMap()
  const formatNetworkName = useFormatNetworkName()

  const accountChain = useMemo(
    () => account?.genesisHash && chains.find((c) => c.genesisHash === account?.genesisHash),
    [account?.genesisHash, chains],
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
    [account, accountChain, selected, address, chainsMap],
  )

  const accountCompatibleTokens = useMemo(() => {
    return allTokens
      .filter(tokenFilter)
      .filter(filterAccountCompatibleTokens)
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

  // apply user search
  const tokens = useMemo(() => {
    const ls = search?.toLowerCase()
    return accountCompatibleTokens.filter(
      (t) =>
        !ls ||
        t.token.symbol.toLowerCase().includes(ls) ||
        t.chainNameSearch?.toLowerCase().includes(ls),
    )
  }, [search, accountCompatibleTokens])

  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect],
  )

  return (
    <div className="min-h-full">
      {tokens?.map(({ token, chainName, chainLogo, hasFiatRate }) => (
        <TokenRow
          key={token.id}
          selected={token.id === selected}
          token={token}
          chainName={chainName}
          chainLogo={chainLogo}
          hasFiatRate={hasFiatRate}
          onClick={handleAccountClick(token.id)}
        />
      ))}
      {!tokens?.length && (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          {t("No token matches your search")}
        </div>
      )}
    </div>
  )
}

type TokenPickerProps = {
  address?: string
  selected?: TokenId
  initialSearch?: string
  className?: string
  tokenFilter?: (token: Token) => boolean
  onSelect?: (tokenId: TokenId) => void
}

export const BuyTokensPicker: FC<TokenPickerProps> = ({
  address,
  selected,
  initialSearch = "",
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
          tokenFilter={tokenFilter}
          onSelect={onSelect}
        />
      </ScrollContainer>
    </div>
  )
}
