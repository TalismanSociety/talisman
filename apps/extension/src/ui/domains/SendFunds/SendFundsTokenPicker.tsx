import { Balances } from "@core/domains/balances/types"
import { Token, TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { planckToTokens } from "@talismn/util"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { useDbCache } from "@ui/hooks/useDbCache"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTokens from "@ui/hooks/useTokens"
import { sortBy } from "lodash"
import { CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useIntersection } from "react-use"
import { Checkbox, FormFieldInputContainerProps, classNames } from "talisman-ui"

import { ChainLogoBase } from "../Asset/ChainLogo"
import Fiat from "../Asset/Fiat"
import { TokenLogo } from "../Asset/TokenLogo"
import Tokens from "../Asset/Tokens"
import { SendFundsSearchInput } from "./SendFundsSearchInput"

type TokenRowProps = {
  token: Token
  selected: boolean
  onClick?: () => void
  balances: Balances
  chainName?: string | null
  chainLogo?: string | null
}

const TokenRowSkeleton = ({ color = "bg-grey-600" }) => (
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
  onClick,
}) => {
  const { tokensTotal, isLoading } = useMemo(() => {
    const planck = balances.sorted.reduce((prev, curr) => prev + curr.transferable.planck, 0n)
    return {
      tokensTotal: planckToTokens(planck.toString(), token.decimals),
      isLoading: balances.sorted.find((b) => b.status === "cache"),
    }
  }, [balances.sorted, token.decimals])

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
      tabIndex={1}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary",
        intersection?.isIntersecting ? "animate-fade-in-fast" : "opacity-0"
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
              <div>
                {token.symbol}
                {selected && <CheckCircleIcon className="ml-3 inline align-text-top" />}
                {isLoading && (
                  <LoaderIcon className="animate-spin-slow text-body-secondary ml-3 inline align-text-top text-base" />
                )}
              </div>
              <div>
                <Tokens
                  amount={tokensTotal}
                  decimals={token.decimals}
                  symbol={token.symbol}
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
              <div className="grow">
                <Fiat amount={balances.sum.fiat("usd").total} currency="usd" isBalance noCountUp />
              </div>
            </div>
          </div>
        </>
      )}
    </button>
  )
}

type TokensListProps = {
  from?: Address
  selected?: TokenId
  search?: string
  onSelect?: (tokenId: TokenId) => void
}

const TokensList: FC<TokensListProps> = ({ from, selected, search, onSelect }) => {
  const allTokens = useTokens()

  // TODO remove wen we get a better map hook
  const chains = useChains()
  const evmNetworks = useEvmNetwork()

  const balances = useBalances()

  const accountBalances = useMemo(
    () => (from ? balances.find({ address: from ?? undefined }) : balances),
    [balances, from]
  )

  const filterAccountCompatibleTokens = useCallback(
    (token: Token) => {
      if (!from) return true
      return isEthereumAddress(from) ? !!token.evmNetwork : !!token.chain
    },
    [from]
  )

  const { chainsMap, evmNetworksMap } = useDbCache()

  // TODO if we have a tokenId, filter account types
  const transferableTokens = useMemo(
    () =>
      allTokens
        .filter(filterAccountCompatibleTokens)
        .filter((t) => {
          // on substrate, there could be multiple tokens with same symbol on a same chain (ACA, KINT..)
          // a good fix would be to detect on subsquid side if ANY account has tokens, if not the token shouldn't be included in github tokens file
          // until then we hardcode an exclusion list here :

          // ACA, BNC and KAR use native (orml won't work)
          // INTR, KINT and MGX use orml (native won't work)

          const IGNORED_TOKENS = [
            "acala-substrate-orml-aca",
            "bifrost-kusama-substrate-orml-bnc",
            "bifrost-polkadot-substrate-orml-bnc",
            "interlay-substrate-native-intr",
            "karura-substrate-orml-kar",
            "kintsugi-substrate-native-kint",
            "mangata-substrate-native-mgx",
          ]

          return !IGNORED_TOKENS.includes(t.id)
        })
        .map((t) => ({
          id: t.id,
          token: t,
          chain: t.chain && chainsMap[t.chain.id],
          evmNetwork: t.evmNetwork && evmNetworksMap[t.evmNetwork.id],
        }))
        .map(({ token, chain, evmNetwork }) => ({
          id: token.id,
          token,
          chainNameSearch: chain?.name ?? evmNetwork?.name,
          chainName:
            chain?.name ??
            (evmNetwork
              ? `${evmNetwork?.name}${evmNetwork?.substrateChain ? " (Ethereum)" : ""}`
              : ""),
          chainLogo: chain?.logo ?? evmNetwork?.logo,
        })),

    [allTokens, chainsMap, evmNetworksMap, filterAccountCompatibleTokens]
  )

  const transferableTokensWithBalances = useMemo(() => {
    const results = sortBy(
      transferableTokens.map((t) => ({
        ...t,
        balances: accountBalances.find({ tokenId: t.id }),
        sortIndex: 1 + accountBalances.sorted.findIndex((b) => b.tokenId === t.id),
      })),
      "sortIndex"
    )

    return [
      ...results.filter((t) => t.balances.sorted.find((b) => b.transferable.planck > BigInt(0))),
      ...results.filter((t) => !t.balances.sorted.find((b) => b.transferable.planck > BigInt(0))),
    ]
  }, [accountBalances, transferableTokens])

  // console.log("accountBalances", accountBalances.toJSON())

  const tokens = useMemo(() => {
    const ls = search?.toLowerCase()
    return transferableTokensWithBalances.filter(
      (t) =>
        !ls ||
        t.token.symbol.toLowerCase().includes(ls) ||
        t.chainNameSearch?.toLowerCase().includes(ls)
    )
  }, [search, transferableTokensWithBalances])

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
          {tokens?.map(({ token, balances, chainName, chainLogo }, i) => (
            <TokenRow
              key={token.id}
              selected={token.id === selected}
              token={token}
              balances={balances}
              chainName={chainName}
              chainLogo={chainLogo}
              onClick={handleAccountClick(token.id)}
            />
          ))}
          {!tokens?.length && (
            <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
              No token matches your search
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

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

export const SendFundsTokenPicker = () => {
  const { from, tokenId, set } = useSendFundsWizard()
  const [search, setSearch] = useState("")

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set]
  )

  const [shimmer, setShimmer] = useState(false)

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <SendFundsSearchInput onChange={setSearch} placeholder="Search by account name" autoFocus />
        <Checkbox onChange={(e) => setShimmer(e.target.checked)}>jey</Checkbox>
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <TokensList from={from} selected={tokenId} search={search} onSelect={handleTokenSelect} />
      </ScrollContainer>
    </div>
  )
}
