import { activeTokensStore, isTokenActive } from "@core/domains/balances/store.activeTokens"
import {
  isTokenCustom,
  isTokenEvmUniswapV2,
  isTokenInTypes,
  type NetworkId,
  type Token,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { MoreHorizontalIcon } from "@talismn/icons"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@ui/components/ContextMenu"
import { Toggle } from "@ui/components/Toggle"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokenTypePill } from "@ui/domains/Asset/TokenTypePill"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkType } from "@ui/domains/Networks/NetworkType"
import {
  useActiveTokensState,
  useAnyNetwork,
  useNetworksMapById,
  useTokens,
} from "@ui/state/chaindata"
import { sortBy } from "lodash-es"
import { type FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import urlJoin from "url-join"

import type { PlatformOption } from "../Networks/usePlatformOptions"

export const TokensList: FC<{
  platform: PlatformOption
  networkId: NetworkId | null
  search?: string
  isActiveOnly?: boolean
  isCustomOnly?: boolean
  isHidePools?: boolean
}> = ({ networkId, platform, search, isActiveOnly, isCustomOnly, isHidePools }) => {
  const { t } = useTranslation()
  const networksMap = useNetworksMapById({
    platform,
    activeOnly: true,
    includeTestnets: true,
  })
  const tokens = useTokens()
  const activeTokens = useActiveTokensState()

  const defaultTokens = useMemo(() => {
    const results = tokens
      .filter((t) => !!networksMap[t.networkId])
      .filter((t) => !networkId || t.networkId === networkId)
      .filter((t) => t.type !== "substrate-dtao" || !t.hotkey) // hide validator-specific dtao tokens

    return sortBy(
      results,
      (t) => networksMap[t.networkId]?.name,
      (t) => t.symbol
    )
  }, [tokens, networksMap, networkId])

  // keep displayed networks list as state so if activeOnly is on, disabling a network doesnt make it disappear
  // also helps performance
  const [displayedTokens, setDisplayedTokens] = useState<Token[]>(() => defaultTokens)

  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment below
  useEffect(() => {
    const lowerSearch = search?.trim().toLowerCase()

    const results = defaultTokens
      .filter((t) => !!search || !isActiveOnly || isTokenActive(t, activeTokens))
      .filter((t) => !!search || !isCustomOnly || isTokenCustom(t))
      .filter((t) => !!search || !isHidePools || !isTokenEvmUniswapV2(t))
      .filter(
        (t) =>
          !lowerSearch ||
          [t.symbol, t.name, t.type].join().toLowerCase().includes(lowerSearch) ||
          (isTokenInTypes(t, ["evm-erc20", "evm-uniswapv2"]) &&
            isAddressEqual(t.contractAddress, lowerSearch))
      )

    // exact matches first
    if (lowerSearch)
      results.sort((a, b) => {
        const aMatch = a.symbol.toLowerCase() === lowerSearch
        const bMatch = b.symbol.toLowerCase() === lowerSearch
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
        return 0
      })

    setDisplayedTokens(results)

    // ⚠️ We don't want networksActiveState as dependency here, or if activeOnly is true, disabling a network would make it disappear from the list
  }, [defaultTokens, isActiveOnly, isCustomOnly, isHidePools, search])

  if (!displayedTokens.length)
    return (
      <div className="my-12 rounded bg-grey-850 py-24 text-center text-body-secondary">
        <div>{t("No token found")}</div>
        <div>{t("Consider adding it manually as a custom token")}</div>
      </div>
    )

  return (
    <div className="flex w-full min-w-112.5 flex-col gap-4 text-left text-base text-body">
      <div className="grid grid-cols-[40%_40%_20%] px-8 font-normal text-body-disabled text-sm">
        <div>{t("Asset")}</div>
        <div>{t("Network")}</div>
        <div className="pr-20 text-right">{t("Active")}</div>
      </div>
      <VirtualizedRows tokens={displayedTokens} />
    </div>
  )
}

const VirtualizedRows: FC<{ tokens: Token[] }> = ({ tokens }) => {
  const virtualizer = useVirtualizer({
    count: tokens.length,
    overscan: 6,
    gap: 8,
    estimateSize: () => 56,
    getScrollElement: () => document.getElementById("main"),
  })

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute top-0 left-0 w-full"
            style={{
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <TokenRow token={tokens[item.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}

const TokenRow: FC<{ token: Token }> = ({ token }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const activeTokens = useActiveTokensState()
  const network = useAnyNetwork(token.networkId)
  const blockExplorerUrl = useBlockExplorerUrl(token)
  const coingeckoUrl = useCoingeckoUrl(token)

  if (!network) return null

  return (
    <div className="relative h-28 w-full">
      <div className="grid h-28 w-full grid-cols-[40%_40%_20%] items-center truncate rounded-sm bg-grey-850 px-8 pr-6 font-normal text-body-secondary">
        <div className="flex items-center gap-4 overflow-hidden text-body">
          <TokenLogo tokenId={token.id} className="shrink-0 text-xl" />
          <div className="flex flex-col justify-center gap-2 overflow-hidden">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="truncate text-base">
                <TokenDisplaySymbol tokenId={token.id} />
              </div>
              <TokenTypePill type={token.type} />
              {isTokenCustom(token) && <CustomPill />}
            </div>
            <div className="truncate text-body-inactive text-xs">{token.name}</div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden text-body">
            <NetworkLogo networkId={network.id} className="shrink-0 truncate text-base text-body" />
            <div>{network.name}</div>
          </div>
          <div className="truncate text-body-inactive text-xs">
            <NetworkType networkId={network.id} />
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-4 text-right">
          <Toggle
            checked={isTokenActive(token, activeTokens)}
            onChange={(e) => {
              e.stopPropagation()
              e.preventDefault()
              activeTokensStore.setActive(token.id, e.target.checked)
            }}
          />
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="rounded-sm bg-grey-800 p-3 hover:bg-grey-700 hover:text-body">
              <MoreHorizontalIcon />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => navigate(`./${token.id}`)}>
                {t("Token details")}
              </ContextMenuItem>
              {!!blockExplorerUrl && (
                <ContextMenuItem onClick={() => window.open(blockExplorerUrl, "_blank")}>
                  {t("View on block explorer")}
                </ContextMenuItem>
              )}
              {coingeckoUrl && (
                <ContextMenuItem onClick={() => window.open(coingeckoUrl, "_blank")}>
                  {t("View on Coingecko")}
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
    </div>
  )
}

const CustomPill = () => {
  const { t } = useTranslation()

  return (
    <div className="inline-block rounded bg-primary/10 p-4 py-2 font-light text-primary text-xs">
      {t("Custom")}
    </div>
  )
}

const useBlockExplorerUrl = (token: Token) => {
  const network = useAnyNetwork(token.networkId)

  return useMemo(() => {
    const url = network?.blockExplorerUrls[0]
    if (!url) return null

    if (isTokenInTypes(token, ["evm-erc20", "evm-uniswapv2"]))
      return urlJoin(url, "token", token.contractAddress)

    return null
  }, [network?.blockExplorerUrls, token])
}

const useCoingeckoUrl = (token: Token) => {
  return useMemo(
    () =>
      token.coingeckoId ? urlJoin("https://coingecko.com/en/coins/", token.coingeckoId) : null,
    [token]
  )
}
