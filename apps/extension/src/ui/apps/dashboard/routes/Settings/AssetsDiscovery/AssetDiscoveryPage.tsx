import {
  AccountJsonAny,
  AssetDiscoveryMode,
  DiscoveredBalance,
  activeEvmNetworksStore,
  activeTokensStore,
  isEvmNetworkActive,
  isTokenActive,
} from "@extension/core"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address, BalanceFormatter } from "@talismn/balances"
import { EvmNetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import {
  ChevronDownIcon,
  DiamondIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import {
  assetDiscoveryScanAtom,
  assetDiscoveryScanProgressAtom,
  evmNetworksMapAtomFamily,
  settingsAtomFamily,
  tokensMapAtomFamily,
} from "@ui/atoms"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { TokenTypePill } from "@ui/domains/Asset/TokenTypePill"
import useAccounts from "@ui/hooks/useAccounts"
import { useActiveEvmNetworksState } from "@ui/hooks/useActiveEvmNetworksState"
import { useActiveTokensState } from "@ui/hooks/useActiveTokensState"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useAppState } from "@ui/hooks/useAppState"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useToken from "@ui/hooks/useToken"
import useTokens from "@ui/hooks/useTokens"
import { isErc20Token } from "@ui/util/isErc20Token"
import { isUniswapV2Token } from "@ui/util/isUniswapV2Token"
import { atom, useAtomValue } from "jotai"
import { ChangeEventHandler, FC, ReactNode, useCallback, useEffect, useMemo, useRef } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import urlJoin from "url-join"

import { DashboardLayout } from "../../../layout/DashboardLayout"
import { AccountsStack } from "../Accounts/AccountIconsStack"
import {
  useAssetDiscoveryFetchTokenRates,
  useAssetDiscoveryTokenRate,
} from "./useAssetDiscoveryTokenRates"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Asset Discovery",
  featureVersion: 1,
  page: "Settings - Asset Discovery",
}

const AccountsTooltip: FC<{ addresses: Address[] }> = ({ addresses }) => {
  const allAccounts = useAccounts("all")
  const accounts = useMemo(
    () =>
      [...new Set(addresses)]
        .map((add) => allAccounts.find((acc) => acc.address === add))
        .filter(Boolean) as AccountJsonAny[],
    [allAccounts, addresses]
  )
  const { t } = useTranslation("admin")
  return (
    <div className="text-body-disabled flex flex-col gap-2 p-2 text-left text-xs">
      <div>{t("Accounts")}</div>
      <div className="bg-body-disabled/50 mb-2 h-0.5 w-full" />
      {accounts.map((account) => (
        <div
          key={account.address}
          className="flex w-[30rem] items-center gap-2 overflow-hidden whitespace-nowrap text-sm"
        >
          <AccountIcon address={account.address} genesisHash={account.genesisHash} />
          <div className="text-body grow truncate">{account.name}</div>
          <div>{shortenAddress(account.address)}</div>
        </div>
      ))}
    </div>
  )
}

const useBlockExplorerUrl = (token: Token | null) => {
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  return useMemo(() => {
    if ((isErc20Token(token) || isUniswapV2Token(token)) && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "token", token.contractAddress)

    return null
  }, [token, evmNetwork?.explorerUrl])
}

const useCoingeckoUrl = (token: Token | null) => {
  return useMemo(
    () =>
      token?.coingeckoId ? urlJoin("https://coingecko.com/en/coins/", token.coingeckoId) : null,
    [token]
  )
}

const AssetRowContent: FC<{ tokenId: TokenId; assets: DiscoveredBalance[] }> = ({
  tokenId,
  assets,
}) => {
  const { t } = useTranslation("admin")
  const { genericEvent } = useAnalytics()
  const token = useToken(tokenId)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const tokenRates = useAssetDiscoveryTokenRate(token?.id)
  const activeEvmNetworks = useActiveEvmNetworksState()
  const activeTokens = useActiveTokensState()

  const balance = useMemo(() => {
    if (!token) return null
    const plancks = assets.reduce((acc, asset) => acc + BigInt(asset.balance ?? 0), 0n)
    return new BalanceFormatter(plancks, token?.decimals, tokenRates ?? undefined)
  }, [assets, token, tokenRates])

  const allAccounts = useAccounts()
  const accounts = useMemo(
    () =>
      [...new Set(assets.map((a) => a.address))]
        .map((add) => allAccounts.find((acc) => acc.address === add))
        .filter(Boolean) as AccountJsonAny[],
    [allAccounts, assets]
  )

  const isActive = useMemo(
    () =>
      !!evmNetwork &&
      !!token &&
      isEvmNetworkActive(evmNetwork, activeEvmNetworks) &&
      isTokenActive(token, activeTokens),
    [activeEvmNetworks, activeTokens, evmNetwork, token]
  )

  const handleToggleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const checked = e.target.checked
      if (!token || !evmNetwork) return

      if (checked) activeEvmNetworksStore.setActive(evmNetwork.id, true)
      // when unchecking, dont disable the network except for native tokens
      else if (token.type === "evm-native") activeEvmNetworksStore.setActive(evmNetwork.id, false)
      // if token is not native, allow it to be toggled. Native tokens are taken care of by the network toggle
      if (token.type !== "evm-native") activeTokensStore.setActive(token.id, checked)
    },
    [evmNetwork, token]
  )

  const isInactiveNetwork = useMemo(
    () => evmNetwork && !isEvmNetworkActive(evmNetwork, activeEvmNetworks),
    [activeEvmNetworks, evmNetwork]
  )

  const navigate = useNavigate()
  const blockExplorerUrl = useBlockExplorerUrl(token)
  const coingeckoUrl = useCoingeckoUrl(token)

  const handleViewOnExplorerClick = useCallback(() => {
    if (!blockExplorerUrl) return
    window.open(blockExplorerUrl, "_blank")
    genericEvent("open view on explorer", { from: "asset discovery" })
  }, [blockExplorerUrl, genericEvent])

  const handleViewOnCoingeckoClick = useCallback(() => {
    if (!coingeckoUrl) return
    window.open(coingeckoUrl, "_blank")
    genericEvent("open view on coingecko", { from: "asset discovery" })
  }, [coingeckoUrl, genericEvent])

  if (!token || !evmNetwork) return null

  return (
    <div className="bg-grey-900 grid h-32 grid-cols-[1fr_1fr_1fr_10rem] items-center gap-x-8 rounded-sm px-8">
      <div className="flex items-center gap-6">
        <TokenLogo tokenId={tokenId} className="shrink-0 text-xl" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span>{token.symbol}</span>
            <TokenTypePill type={token.type} className="ml-1" />
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger>
                <AccountsStack accounts={accounts} />
              </TooltipTrigger>
              <TooltipContent>
                <AccountsTooltip addresses={accounts.map((a) => a.address)} />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div>
        {evmNetwork.name}
        {isInactiveNetwork && (
          <Tooltip>
            <TooltipTrigger className="ml-2 inline align-text-top">
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              {t("Activating this token will also activate this network")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-col gap-1 text-right">
        <Tokens
          amount={balance?.tokens}
          decimals={token.decimals}
          symbol={token.symbol}
          isBalance
          noCountUp
        />
        {tokenRates ? (
          <Fiat amount={balance} isBalance noCountUp className="text-body-secondary text-sm" />
        ) : (
          <span className="text-body-secondary text-sm">-</span>
        )}
      </div>
      <div className="flex justify-end gap-8 pl-4 text-right">
        <Toggle checked={isActive} onChange={handleToggleChange} />
        {isErc20Token(token) || isUniswapV2Token(token) || coingeckoUrl ? (
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="hover:text-body bg-grey-800 text-body-secondary hover:bg-grey-700 shrink-0 rounded-sm p-4">
              <MoreHorizontalIcon />
            </ContextMenuTrigger>
            <ContextMenuContent>
              {(isErc20Token(token) || isUniswapV2Token(token)) && (
                <ContextMenuItem
                  onClick={() => navigate(`/settings/networks-tokens/tokens/${token.id}`)}
                >
                  {t("Token details")}
                </ContextMenuItem>
              )}
              {!!blockExplorerUrl && (
                <ContextMenuItem onClick={handleViewOnExplorerClick}>
                  {t("View on block explorer")}
                </ContextMenuItem>
              )}
              {coingeckoUrl && (
                <ContextMenuItem onClick={handleViewOnCoingeckoClick}>
                  {t("View on Coingecko")}
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ) : (
          <div className="h-16 w-16 shrink-0"></div>
        )}
      </div>
    </div>
  )
}

const AssetRow: FC<{ tokenId: TokenId; assets: DiscoveredBalance[] }> = ({ tokenId, assets }) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  // render content only if visible on screen, to prevent performance if many tokens are found. ex: Vitalik's address
  return (
    <div ref={refContainer} className={"h-32"}>
      {!!intersection?.isIntersecting && <AssetRowContent tokenId={tokenId} assets={assets} />}
    </div>
  )
}

const AssetTable: FC = () => {
  const { t } = useTranslation("admin")
  const { balances, balancesByTokenId, tokenIds } = useAtomValue(assetDiscoveryScanProgressAtom)
  // this hook is in charge of fetching the token rates for the tokens that were discovered
  useAssetDiscoveryFetchTokenRates()

  if (!balances.length) return null

  return (
    <div className="text-body flex w-full min-w-[45rem] flex-col gap-4 text-left text-base">
      <div className="text-body-disabled grid grid-cols-[1fr_1fr_1fr_10rem] gap-x-8 px-8 text-sm font-normal">
        <div>{t("Asset")}</div>
        <div>{t("Network")}</div>
        <div className="text-right">{t("Balance")}</div>
        <div></div>
      </div>

      {tokenIds.map((tokenId) => (
        <AssetRow key={tokenId} tokenId={tokenId} assets={balancesByTokenId[tokenId]} />
      ))}
    </div>
  )
}

const Header: FC = () => {
  const { t } = useTranslation("admin")
  const { balances, accountsCount, tokensCount, percent, isInProgress } = useAtomValue(
    assetDiscoveryScanProgressAtom
  )
  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworks: activeNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { evmNetworks: allNetworks } = useEvmNetworks({ activeOnly: false, includeTestnets })

  const handleScanClick = useCallback(
    (mode: AssetDiscoveryMode) => () => {
      api.assetDiscoveryStartScan(mode)
    },
    []
  )
  const handleCancelScanClick = useCallback(() => {
    api.assetDiscoveryStopScan()
  }, [])

  return (
    <div className="bg-grey-850 flex h-[8.6rem] items-center gap-8 rounded-sm px-8">
      <DiamondIcon
        className={classNames("text-lg", isInProgress ? "text-primary" : "text-body-secondary")}
      />
      <div className="flex grow flex-col gap-4 pr-10">
        {isInProgress || balances.length ? (
          <>
            <div className="flex text-base">
              <div className="grow">
                {isInProgress
                  ? t("Scanning {{tokensCount}} tokens for {{count}} account(s)", {
                      tokensCount,
                      count: accountsCount,
                    })
                  : t("Scanned {{tokensCount}} tokens for {{count}} account(s)", {
                      tokensCount,
                      count: accountsCount,
                    })}
              </div>
              <div className="text-primary">{percent}%</div>
            </div>
            <div className="bg-grey-800 relative flex h-4 overflow-hidden rounded-lg">
              <div
                className={classNames(
                  "bg-primary-500 absolute left-0 top-0 h-4 w-full rounded-lg",
                  percent && "transition-transform duration-300 ease-out" // no animation on restart
                )}
                style={{
                  transform: `translateX(-${100 - percent}%)`,
                }}
              ></div>
            </div>
          </>
        ) : (
          <>
            <div className="text-base">{t("Scan well-known tokens")}</div>
            <div className="text-body-secondary text-sm">
              {t("Click to discover tokens for which your accounts have a balance.")}
            </div>
          </>
        )}
      </div>
      {isInProgress ? (
        <Button
          small
          onClick={handleCancelScanClick}
          iconLeft={XIcon}
          className="h-16 min-w-[10.5rem] rounded-full px-4 pr-6"
        >
          {t("Cancel")}
        </Button>
      ) : (
        <ContextMenu placement="bottom-end">
          <ContextMenuTrigger
            className={classNames(
              "bg-primary flex h-16 items-center gap-2 rounded-full border border-transparent px-4 text-xs text-black",
              "focus:border focus:border-white focus:ring-2 focus:ring-white active:border-transparent"
            )}
          >
            <SearchIcon className="text-base" />
            <div className="text-sm">{t("Scan")}</div>
            <div className="mx-1 h-full w-0.5 shrink-0 bg-black/10"></div>
            <ChevronDownIcon className="text-base" />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleScanClick(AssetDiscoveryMode.ACTIVE_NETWORKS)}>
              {t("Scan active networks")} ({activeNetworks.length})
            </ContextMenuItem>
            <ContextMenuItem onClick={handleScanClick(AssetDiscoveryMode.ALL_NETWORKS)}>
              {t("Scan all networks")} ({allNetworks.length})
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
    </div>
  )
}

const AccountsWrapper: FC<{
  children?: ReactNode
  accounts: AccountJsonAny[]
  className?: string
}> = ({ children, accounts, className }) => {
  return (
    <Tooltip>
      <TooltipTrigger className={className}>{children}</TooltipTrigger>
      <TooltipContent>
        <AccountsTooltip addresses={accounts.map((a) => a.address)} />
      </TooltipContent>
    </Tooltip>
  )
}

const ScanInfo: FC = () => {
  const { t } = useTranslation("admin")

  const { balancesByTokenId, balances, isInProgress } = useAtomValue(assetDiscoveryScanProgressAtom)
  const { lastScanAccounts, lastScanTimestamp } = useAtomValue(assetDiscoveryScanAtom)

  const activeEvmNetworks = useActiveEvmNetworksState()
  const activeTokens = useActiveTokensState()
  const { tokensMap } = useTokens({ activeOnly: false, includeTestnets: true })
  const { evmNetworksMap } = useEvmNetworks({ activeOnly: false, includeTestnets: true })

  const canEnable = useMemo(() => {
    const tokenIds = Object.keys(balancesByTokenId)
    return tokenIds.some((tokenId) => {
      const token = tokensMap[tokenId]
      const evmNetwork = evmNetworksMap[token?.evmNetwork?.id ?? ""]
      return (
        token &&
        evmNetwork &&
        (!isEvmNetworkActive(evmNetwork, activeEvmNetworks) || !isTokenActive(token, activeTokens))
      )
    })
  }, [balancesByTokenId, activeEvmNetworks, activeTokens, evmNetworksMap, tokensMap])

  const enableAll = useCallback(async () => {
    const tokenIds = Object.keys(balancesByTokenId)
    const evmNetworkIds = [
      ...new Set(tokenIds.map((tokenId) => tokensMap[tokenId]?.evmNetwork?.id).filter(Boolean)),
    ] as EvmNetworkId[]
    await activeEvmNetworksStore.set(Object.fromEntries(evmNetworkIds.map((id) => [id, true])))
    await activeTokensStore.set(
      Object.fromEntries(
        tokenIds.filter((id) => !id.includes("evm-native")).map((id) => [id, true])
      )
    )
  }, [balancesByTokenId, tokensMap])

  const formatedTimestamp = useMemo(() => {
    const date = new Date(lastScanTimestamp)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }, [lastScanTimestamp])

  const accounts = useAccounts()
  const lastAccounts = useMemo(
    () => accounts.filter((a) => lastScanAccounts.includes(a.address)),
    [accounts, lastScanAccounts]
  )

  return (
    <div className="flex h-16 w-full items-center px-8">
      <div className="text-body-disabled grow">
        {!isInProgress && !!lastScanTimestamp && !!lastScanAccounts.length && (
          <Trans
            t={t}
            defaults="Last scanned <AccountsWrapper>{{count}} account(s)</AccountsWrapper> at <DateWrapper>{{timestamp}}</DateWrapper>"
            components={{
              AccountsWrapper: (
                <AccountsWrapper
                  className="text-body-secondary underline"
                  accounts={lastAccounts}
                />
              ),
              DateWrapper: <span className="text-body-secondary"></span>,
            }}
            values={{ count: lastScanAccounts.length, timestamp: formatedTimestamp }}
          ></Trans>
        )}
      </div>
      {!!balances.length && (
        <Button
          disabled={!canEnable}
          onClick={enableAll}
          className="h-16 rounded-sm"
          iconLeft={PlusIcon}
          small
          primary
        >
          {t("Add all tokens")}
        </Button>
      )}
    </div>
  )
}

const Notice: FC = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="bg-grey-800 text-body-secondary flex items-center gap-8 rounded p-8 py-6">
      <div>
        <InfoIcon className="text-lg" />
      </div>
      <div className="grow text-sm">
        <Trans
          t={t}
          defaults="Networks to be scanned are taken from the community maintained <EthereumListsLink>Ethereum Lists</EthereumListsLink>. Talisman does not curate or control which RPCs are used for these networks. ERC20 tokens to be scanned are the ones listed on <CoingeckoLink>Coingecko</CoingeckoLink>."
          components={{
            CoingeckoLink: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://www.coingecko.com/"
                target="_blank"
                className="text-grey-200 hover:text-body"
              ></a>
            ),
            EthereumListsLink: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://github.com/ethereum-lists/chains"
                target="_blank"
                className="text-grey-200 hover:text-body"
              ></a>
            ),
          }}
        />
      </div>
    </div>
  )
}

const preloadAtom = atom((get) =>
  Promise.all([
    get(settingsAtomFamily("useTestnets")),
    get(evmNetworksMapAtomFamily({ activeOnly: true, includeTestnets: false })),
    get(tokensMapAtomFamily({ activeOnly: true, includeTestnets: false })),
  ])
)

export const AssetDiscoveryPage = () => {
  const { t } = useTranslation("admin")
  useAtomValue(preloadAtom)

  useAnalyticsPageView(ANALYTICS_PAGE)
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")

  // hide alert when user browses this page
  useEffect(() => {
    if (showAssetDiscoveryAlert) setShowAssetDiscoveryAlert(false)
  }, [setShowAssetDiscoveryAlert, showAssetDiscoveryAlert])

  return (
    <DashboardLayout
      analytics={ANALYTICS_PAGE}
      withBack
      centered
      backTo="/settings/networks-tokens"
      large
      className="max-w-[81rem]"
    >
      <HeaderBlock
        title={t("Asset Discovery")}
        text={t("Scan for well-known tokens in your accounts and add them to your portfolio.")}
      />
      <Spacer small />
      <Notice />
      <Spacer large />
      <Header />
      <Spacer small />
      <ScanInfo />
      <Spacer large />
      <AssetTable />
    </DashboardLayout>
  )
}
