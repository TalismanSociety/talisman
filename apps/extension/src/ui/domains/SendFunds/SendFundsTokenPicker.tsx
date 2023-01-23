import { Balances } from "@core/domains/balances/types"
import { IToken, Token, TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { planckToTokens } from "@talismn/util"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useBalances from "@ui/hooks/useBalances"
import useChains from "@ui/hooks/useChains"
import { useDbCache } from "@ui/hooks/useDbCache"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useTokens from "@ui/hooks/useTokens"
import { sortBy } from "lodash"
import { FC, useCallback, useMemo, useState } from "react"
import { FormFieldInputContainerProps, classNames } from "talisman-ui"

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

const TokenRow: FC<TokenRowProps> = ({
  token,
  selected,
  balances,
  chainName,
  chainLogo,
  onClick,
}) => {
  const { tokensTotal, isLoading } = useMemo(() => {
    const planck = balances.sorted.reduce(
      (prev, curr) => prev + curr.transferable.planck,
      BigInt("0")
    )
    return {
      tokensTotal: planckToTokens(planck.toString(), token.decimals),
      isLoading: balances.sorted.find((b) => b.status === "cache"),
    }
  }, [balances.sorted, token.decimals])

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={1}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        selected && "bg-grey-800 text-body-secondary"
      )}
    >
      <TokenLogo tokenId={token.id} className="!text-xl" />
      <div className="grow space-y-[5px]">
        <div
          className={classNames(
            "flex w-full justify-between text-sm font-bold",
            selected ? "text-body-secondary" : "text-body"
          )}
        >
          <div className="">
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
            <Fiat amount={balances.sum.fiat("usd").total} currency="usd" isBalance />
          </div>
        </div>
      </div>
    </button>
  )
}

type TokensListProps = {
  from?: Address | null
  selected: TokenId | null
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
    () => balances.find({ address: from ?? undefined }),
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

  // TODO implement virtualization ? that's a LOT of rows
  return (
    <div className="min-h-full">
      {/* <div className="text-body-secondary px-12 font-bold">
        <TalismanHandIcon className="mr-2 inline-block" />
        My Accounts
      </div> */}
      {tokens?.map(({ token, balances, chainName, chainLogo }) => (
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
    </div>
  )
}

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

export const SendFundsTokenPicker = () => {
  const { from, tokenId, set } = useSendFunds()
  const [search, setSearch] = useState("")

  const handleTokenSelect = useCallback(
    (tokenId: TokenId) => {
      set("tokenId", tokenId, true)
    },
    [set]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <SendFundsSearchInput onChange={setSearch} placeholder="Search by account name" autoFocus />
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <TokensList from={from} selected={tokenId} search={search} onSelect={handleTokenSelect} />
      </ScrollContainer>
    </div>
  )
}
