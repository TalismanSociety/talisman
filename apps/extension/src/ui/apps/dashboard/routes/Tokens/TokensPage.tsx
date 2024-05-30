import { activeTokensStore, isTokenActive } from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { TogglePill } from "@talisman/components/TogglePill"
import { CustomEvmNetwork, EvmNetwork, EvmNetworkId, Token } from "@talismn/chaindata-provider"
import { MoreHorizontalIcon, PlusIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import {
  chainsMapAtomFamily,
  evmNetworksMapAtomFamily,
  settingsAtomFamily,
  tokensMapAtomFamily,
} from "@ui/atoms"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokenTypePill } from "@ui/domains/Asset/TokenTypePill"
import { NetworkLogo } from "@ui/domains/Ethereum/NetworkLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useActiveTokensState } from "@ui/hooks/useActiveTokensState"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isCustomUniswapV2Token } from "@ui/util/isCustomUniswapV2Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import { isUniswapV2Token } from "@ui/util/isUniswapV2Token"
import { atom, useAtomValue } from "jotai"
import sortBy from "lodash/sortBy"
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Dropdown,
  Toggle,
} from "talisman-ui"
import urlJoin from "url-join"

const CustomPill = () => {
  const { t } = useTranslation("admin")

  return (
    <div className="bg-primary/10 text-primary inline-block rounded p-4 py-2 text-xs font-light">
      {t("Custom")}
    </div>
  )
}

const useBlockExplorerUrl = (token: Token) => {
  const evmNetwork = useEvmNetwork(token.evmNetwork?.id)

  return useMemo(() => {
    if (isErc20Token(token) && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "token", token.contractAddress)
    if (isUniswapV2Token(token) && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "token", token.contractAddress)

    return null
  }, [token, evmNetwork?.explorerUrl])
}

const useCoingeckoUrl = (token: Token) => {
  return useMemo(
    () =>
      token.coingeckoId ? urlJoin("https://coingecko.com/en/coins/", token.coingeckoId) : null,
    [token]
  )
}

const TokenRow: FC<{ token: Token }> = ({ token }) => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()

  const activeTokens = useActiveTokensState()
  const network = useEvmNetwork(token.evmNetwork?.id)
  const blockExplorerUrl = useBlockExplorerUrl(token)
  const coingeckoUrl = useCoingeckoUrl(token)

  return (
    <div className="relative h-28 w-full">
      <div className="bg-grey-850 text-body-secondary grid h-28 w-full grid-cols-[40%_40%_20%] items-center truncate rounded-sm px-8 pr-6 font-normal">
        <div className="text-body flex items-center gap-4 overflow-hidden">
          <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
          <div className="truncate">{token.symbol}</div>
          <TokenTypePill type={token.type} />
          {isCustomErc20Token(token) && <CustomPill />}
          {isCustomUniswapV2Token(token) && <CustomPill />}
        </div>
        <div className="text-body flex items-center gap-4 overflow-hidden">
          <NetworkLogo ethChainId={network?.id} className="shrink-0 text-lg" />
          <div className="truncate">{network?.name}</div>
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

const TokenRowContainer: FC<{ token: Token }> = ({ token }) => {
  // there are lots of tokens so we should only render visible rows to prevent performance issues
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-28">
      {intersection?.isIntersecting ? <TokenRow token={token} /> : null}
    </div>
  )
}

const TokensTable: FC<{ tokens: Token[] }> = ({ tokens }) => {
  const { t } = useTranslation("admin")

  if (!tokens.length)
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

      {tokens.map((token) => (
        <TokenRowContainer key={token.id} token={token} />
      ))}
    </div>
  )
}

const renderNetwork = (network: EvmNetwork | CustomEvmNetwork) => {
  return (
    <div className="flex items-center gap-5">
      <NetworkLogo ethChainId={network.id} className="text-[1.25em]" />
      <span>{network.name}</span>
    </div>
  )
}

const NetworkSelect = ({
  networks,
  selectedId,
  onChange,
}: {
  networks: (EvmNetwork | CustomEvmNetwork)[]
  selectedId: EvmNetworkId | null
  onChange: (evmNetworkId: EvmNetworkId) => void
}) => {
  const [selected, setSelected] = useState<EvmNetwork | CustomEvmNetwork | undefined>(
    networks.find((n) => n.id === selectedId)
  )

  useEffect(() => {
    // networks may not be loaded on first render
    // handle default selection here
    if (!selected) {
      const defaultNetwork = networks.find((n) => n.id === selectedId)
      if (defaultNetwork) setSelected(defaultNetwork)
    }
  }, [selectedId, networks, selected])

  const handleChange = useCallback(
    (item: EvmNetwork | CustomEvmNetwork | null) => {
      if (!item) return
      setSelected(item)
      if (onChange) onChange(item.id)
    },
    [onChange]
  )

  return (
    <Dropdown
      items={networks}
      propertyKey="id"
      renderItem={renderNetwork}
      value={selected}
      onChange={handleChange}
      className="[&>div>button]:h-[4.6rem]"
    />
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Tokens",
}

const preloadAtom = atom((get) =>
  Promise.all([
    get(settingsAtomFamily("useTestnets")),
    get(chainsMapAtomFamily({ activeOnly: true, includeTestnets: false })),
    get(evmNetworksMapAtomFamily({ activeOnly: true, includeTestnets: false })),
    get(tokensMapAtomFamily({ activeOnly: true, includeTestnets: false })),
  ])
)

export const TokensPage = () => {
  const { t } = useTranslation("admin")
  useAtomValue(preloadAtom)

  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const location = useLocation()

  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworks, evmNetworksMap } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { tokens } = useTokens({ activeOnly: false, includeTestnets })
  const activeTokens = useActiveTokensState()
  const [isActiveOnly, setIsActiveOnly] = useState(false)
  const [isCustomOnly, setIsCustomOnly] = useState(false)
  const [isHidePools, setIsHidePools] = useState(false)

  const toggleIsActiveOnly = useCallback(() => setIsActiveOnly((prev) => !prev), [])
  const toggleIsCustomOnly = useCallback(() => setIsCustomOnly((prev) => !prev), [])
  const toggleIsHidePools = useCallback(() => setIsHidePools((prev) => !prev), [])

  const networkOptions = useMemo(() => {
    return [{ id: "ALL", name: "All networks" } as EvmNetwork, ...sortBy(evmNetworks, "name")]
  }, [evmNetworks])
  const [evmNetworkId, setEvmNetworkId] = useState<EvmNetworkId>("ALL")

  // search value is debounced by SearchInput component
  // keep search value in location state to preserve it when user clicks a token then goes back
  const [search, setSearch] = useState(location.state?.search ?? "")
  useEffect(() => {
    navigate(location.pathname, { replace: true, state: { search } })
  }, [location.pathname, navigate, search])

  const filteredTokens = useMemo(() => {
    const result = tokens
      .filter((t) => isErc20Token(t) || isUniswapV2Token(t))
      .filter((t) => !!t.evmNetwork?.id && evmNetworksMap[t.evmNetwork.id])
      .filter((t) => !isActiveOnly || isTokenActive(t, activeTokens))
      .filter((t) => !isCustomOnly || isCustomErc20Token(t) || isCustomUniswapV2Token(t))
      .filter((t) => !isHidePools || !isUniswapV2Token(t))
      .filter((t) => evmNetworkId === "ALL" || t.evmNetwork?.id === evmNetworkId)

    return sortBy(
      result,
      (t) => evmNetworksMap[t.evmNetwork!.id].name,
      (t) => t.symbol
    )
  }, [activeTokens, evmNetworkId, evmNetworksMap, isActiveOnly, isCustomOnly, isHidePools, tokens])

  const displayTokens = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    const knownTokens = Object.keys(activeTokens) // ids of all tokens that were ever activated
    if (!lowerSearch && evmNetworkId === "ALL")
      return filteredTokens.filter(
        (t) =>
          t.isDefault ||
          isCustomErc20Token(t) ||
          isCustomUniswapV2Token(t) ||
          knownTokens.includes(t.id)
      )

    return filteredTokens.filter(
      (t) =>
        !lowerSearch ||
        (t.type === "evm-erc20" && "erc20".includes(lowerSearch)) ||
        (t.type === "evm-uniswapv2" && "univ2".includes(lowerSearch)) ||
        t.symbol.toLowerCase().includes(lowerSearch) ||
        (isErc20Token(t) && t.contractAddress.toLowerCase().includes(lowerSearch)) ||
        (isUniswapV2Token(t) && t.contractAddress.toLowerCase().includes(lowerSearch))
    )
  }, [activeTokens, evmNetworkId, filteredTokens, search])

  const handleAddToken = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add token button",
    })
    navigate("./add")
  }, [navigate])

  if (!filteredTokens) return null

  return (
    <DashboardLayout
      analytics={ANALYTICS_PAGE}
      withBack
      centered
      backTo="/settings/networks-tokens"
    >
      <div className="flex w-full gap-8">
        <HeaderBlock
          title={t("Ethereum Tokens")}
          className="grow"
          text={
            <Trans
              t={t}
              defaults="Enable, add or delete custom ERC20 tokens.<br/>Tokens list is provided by Coingecko."
            />
          }
        />
        <Button primary iconLeft={PlusIcon} small onClick={handleAddToken}>
          {t("Add custom token")}
        </Button>
      </div>
      <Spacer large />
      <NetworkSelect
        networks={networkOptions}
        onChange={setEvmNetworkId}
        selectedId={evmNetworkId}
      />
      <div className="h-4"></div>
      <div className="flex gap-4">
        <SearchInput
          initialValue={search}
          onChange={setSearch}
          placeholder={
            evmNetworkId === "ALL" ? t("Search to display more tokens") : t("Search tokens")
          }
          containerClassName="rounded-sm"
        />
      </div>
      <div className="h-4"></div>
      <div className="flex justify-end gap-4">
        <TogglePill label={t("Active only")} checked={isActiveOnly} onChange={toggleIsActiveOnly} />
        <TogglePill label={t("Custom only")} checked={isCustomOnly} onChange={toggleIsCustomOnly} />
        <TogglePill label={t("Enable pools")} checked={!isHidePools} onChange={toggleIsHidePools} />
        <EnableTestnetPillButton className="h-16" />
      </div>
      <Spacer />
      <TokensTable tokens={displayTokens} />
    </DashboardLayout>
  )
}
