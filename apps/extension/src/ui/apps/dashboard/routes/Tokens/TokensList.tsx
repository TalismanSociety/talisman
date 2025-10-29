import {
  isTokenCustom,
  isTokenEvmUniswapV2,
  isTokenInTypes,
  NetworkId,
  Token,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { MoreHorizontalIcon } from "@talismn/icons"
import { useVirtualizer } from "@tanstack/react-virtual"
import { activeTokensStore, isTokenActive } from "extension-core"
import { sortBy } from "lodash-es"
import { FC, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Toggle,
} from "talisman-ui"
import urlJoin from "url-join"

import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokenTypePill } from "@ui/domains/Asset/TokenTypePill"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkType } from "@ui/domains/Networks/NetworkType"
import { useActiveTokensState, useAnyNetwork, useNetworksMapById, useTokens } from "@ui/state"

import { PlatformOption } from "../Networks/usePlatformOptions"

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
      (t) => t.symbol,
    )
  }, [tokens, networksMap, networkId])

  // keep displayed networks list as state so if activeOnly is on, disabling a network doesnt make it disappear
  // also helps performance
  const [displayedTokens, setDisplayedTokens] = useState<Token[]>(() => defaultTokens)

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
            isAddressEqual(t.contractAddress, lowerSearch)),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTokens, isActiveOnly, isCustomOnly, isHidePools, search])

  if (!displayedTokens.length)
    return (
      <div className="bg-grey-850 text-body-secondary my-12 rounded py-24 text-center">
        <div>{t("No token found")}</div>
        <div>{t("Consider adding it manually as a custom token")}</div>
      </div>
    )

  return (
    <div className="text-body flex w-full min-w-[45rem] flex-col gap-4 text-left text-base">
      <div className="text-body-disabled grid grid-cols-[40%_40%_20%] px-8 text-sm font-normal">
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
            className="absolute left-0 top-0 w-full"
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
      <div className="bg-grey-850 text-body-secondary grid h-28 w-full grid-cols-[40%_40%_20%] items-center truncate rounded-sm px-8 pr-6 font-normal">
        <div className="text-body flex items-center gap-4 overflow-hidden">
          <TokenLogo tokenId={token.id} className="shrink-0 text-xl" />
          <div className="flex flex-col justify-center gap-2 overflow-hidden">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="truncate text-base">
                <TokenDisplaySymbol tokenId={token.id} />
              </div>
              <TokenTypePill type={token.type} />
              {isTokenCustom(token) && <CustomPill />}
            </div>
            <div className="text-body-inactive truncate text-xs">{token.name}</div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 overflow-hidden">
          <div className="text-body flex items-center gap-3 overflow-hidden">
            <NetworkLogo networkId={network.id} className="text-body shrink-0 truncate text-base" />
            <div>{network.name}</div>
          </div>
          <div className="text-body-inactive truncate text-xs">
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
            <ContextMenuTrigger className="hover:text-body bg-grey-800 hover:bg-grey-700 rounded-sm p-3">
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
    <div className="bg-primary/10 text-primary inline-block rounded p-4 py-2 text-xs font-light">
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
    [token],
  )
}
