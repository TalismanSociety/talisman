import { db } from "@core/db"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { AssetDiscoveryMode, DiscoveredBalance } from "@core/domains/assetDiscovery/types"
import {
  activeEvmNetworksStore,
  isEvmNetworkActive,
} from "@core/domains/ethereum/store.activeEvmNetworks"
import { activeTokensStore, isTokenActive } from "@core/domains/tokens/store.activeTokens"
import { TokenId } from "@core/domains/tokens/types"
import { log } from "@core/log"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address, BalanceFormatter } from "@talismn/balances"
import { EvmNetworkId, Token, TokenList } from "@talismn/chaindata-provider"
import {
  CheckCircleIcon,
  ChevronDownIcon,
  DiamondIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@talismn/icons"
import { fetchTokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import useAccounts from "@ui/hooks/useAccounts"
import { useActiveEvmNetworksState } from "@ui/hooks/useActiveEvmNetworksState"
import { useActiveTokensState } from "@ui/hooks/useActiveTokensState"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useAppState } from "@ui/hooks/useAppState"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useToken from "@ui/hooks/useToken"
import useTokens from "@ui/hooks/useTokens"
import { isErc20Token } from "@ui/util/isErc20Token"
import { liveQuery } from "dexie"
import groupBy from "lodash/groupBy"
import { FC, ReactNode, useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { atom, selector, useRecoilValue } from "recoil"
import { debounceTime, first, from, merge } from "rxjs"
import {
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import urlJoin from "url-join"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { AccountsStack } from "./Accounts/AccountIconsStack"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Asset Discovery",
  featureVersion: 1,
  page: "Settings - Asset Discovery",
}

const assetDiscoveryBalancesState = atom<DiscoveredBalance[]>({
  key: "assetDiscoveryBalancesState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const obs = from(liveQuery(() => db.assetDiscovery.toArray()))

      // backend will do a lot of updates
      // debounce to mitigate performance issues
      // also, we only need the first value to hydrate the atom
      const sub = merge(obs.pipe(first()), obs.pipe(debounceTime(500))).subscribe(setSelf)

      return () => sub.unsubscribe()
    },
  ],
})

const assetDiscoveryScanState = atom<AssetDiscoveryScanState>({
  key: "assetDiscoveryScanState",
  effects: [
    // sync from db
    ({ setSelf }) => {
      const sub = assetDiscoveryStore.observable.subscribe(setSelf)

      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

const scanProgress = selector<{
  percent: number
  balances: DiscoveredBalance[]
  balancesByTokenId: Record<TokenId, DiscoveredBalance[]>
  tokensCount: number
  accounts: Address[]
  accountsCount: number
  isInProgress: boolean
  tokenIds: TokenId[]
}>({
  key: "scanProgress",
  get: ({ get }) => {
    const {
      currentScanId,
      currentScanProgressPercent: percent,
      currentScanAccounts,
      currentScanTokensCount,
      lastScanAccounts,
      lastScanTokensCount,
    } = get(assetDiscoveryScanState)
    const balances = get(assetDiscoveryBalancesState)
    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokenIds = Object.keys(balancesByTokenId)

    const isInProgress = !!currentScanId
    const accounts = isInProgress ? currentScanAccounts : lastScanAccounts
    const tokensCount = isInProgress ? currentScanTokensCount : lastScanTokensCount

    return {
      isInProgress,
      percent,
      balances,
      balancesByTokenId,
      tokensCount,
      accounts,
      accountsCount: accounts.length,
      tokenIds,
    }
  },
})

const TOKEN_RATES_CACHE: TokenList = {}

// our main token rates store only fetches active tokens, this obviously doesn't work here
const useDiscoveredTokenRates = () => {
  const { tokenIds } = useRecoilValue(scanProgress)
  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const tokenList = useMemo(
    () => Object.fromEntries(tokens.filter((t) => tokenIds.includes(t.id)).map((t) => [t.id, t])),
    [tokenIds, tokens]
  )

  const { data } = useQuery({
    queryKey: ["useDiscoveredTokenRates", tokenList],
    queryFn: () => fetchTokenRates(tokenList),
    refetchInterval: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false, // don't retry on error, which is most likely due to rate limit
  })

  return Object.assign(TOKEN_RATES_CACHE, data ?? {})
}

const useDiscoveredTokenRate = (tokenId: TokenId | undefined) => {
  const tokenRates = useDiscoveredTokenRates()
  return tokenId ? tokenRates[tokenId] : undefined
}

const TokenTypePill: FC<{ type: Token["type"]; className?: string }> = ({ type, className }) => {
  const { t } = useTranslation("admin")

  const label = useMemo(() => {
    switch (type) {
      case "evm-erc20":
        return t("ERC20")
      case "evm-native":
        return t("Native")
      default:
        // unsupported for now
        throw null
    }
  }, [t, type])

  if (!label) return null

  return (
    <span
      className={classNames(
        "text-body-disabled rounded-sm border px-2 py-1 text-[1rem]",
        className
      )}
    >
      {label}
    </span>
  )
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

const useBlockExplorerUrl = (token: Token | undefined) => {
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)

  return useMemo(() => {
    if (isErc20Token(token) && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "token", token.contractAddress)

    return null
  }, [token, evmNetwork?.explorerUrl])
}

const useCoingeckoUrl = (token: Token | undefined) => {
  return useMemo(
    () =>
      token?.coingeckoId ? urlJoin("https://coingecko.com/en/coins/", token.coingeckoId) : null,
    [token]
  )
}

const AssetRow: FC<{ tokenId: TokenId; assets: DiscoveredBalance[] }> = ({ tokenId, assets }) => {
  const { t } = useTranslation("admin")
  const token = useToken(tokenId)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const tokenRates = useDiscoveredTokenRate(token?.id)
  const activeEvmNetworks = useActiveEvmNetworksState()
  const activeTokens = useActiveTokensState()

  const balance = useMemo(() => {
    if (!token) return null
    const plancks = assets.reduce((acc, asset) => acc + BigInt(asset.balance ?? 0), 0n)
    return new BalanceFormatter(plancks, token?.decimals, tokenRates)
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
      evmNetwork &&
      token &&
      isEvmNetworkActive(evmNetwork, activeEvmNetworks) &&
      isTokenActive(token, activeTokens),
    [activeEvmNetworks, activeTokens, evmNetwork, token]
  )

  const enable = useCallback(() => {
    if (!token || !evmNetwork) return
    activeEvmNetworksStore.setActive(evmNetwork.id, true)
    if (token.type !== "evm-native") activeTokensStore.setActive(token.id, true)
  }, [evmNetwork, token])

  const isInactiveNetwork = useMemo(
    () => evmNetwork && !isEvmNetworkActive(evmNetwork, activeEvmNetworks),
    [activeEvmNetworks, evmNetwork]
  )

  const navigate = useNavigate()
  const blockExplorerUrl = useBlockExplorerUrl(token)
  const coingeckoUrl = useCoingeckoUrl(token)

  if (!token || !evmNetwork) return null

  return (
    <div
      className={classNames(
        "bg-grey-900 grid h-32 grid-cols-[30%_20%_25%_25%] items-center rounded-sm px-8",
        isActive && "opacity-50"
      )}
    >
      <div className="flex items-center gap-6">
        <div>
          <TokenLogo tokenId={tokenId} className="shrink-0 text-xl" />
        </div>
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
        />
        {tokenRates ? (
          <Fiat amount={balance} isBalance className="text-body-secondary text-sm" />
        ) : (
          <span className="text-body-secondary text-sm">-</span>
        )}
      </div>
      <div className="flex justify-end gap-6 pl-4 text-right">
        <Button
          small
          disabled={isActive}
          onClick={enable}
          primary
          className="disabled:text-primary-500 h-16 w-56 rounded-sm"
          icon={isActive ? CheckCircleIcon : undefined}
        >
          {isActive ? t("Activated") : t("Activate")}
        </Button>
        {isErc20Token(token) || coingeckoUrl ? (
          <ContextMenu placement="bottom-end">
            <ContextMenuTrigger className="hover:text-body bg-grey-800 text-body-secondary hover:bg-grey-700 shrink-0 rounded-sm p-4">
              <MoreHorizontalIcon />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => navigate(`/tokens/${token.id}`)}>
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
        ) : (
          <div className="h-16 w-16 shrink-0"></div>
        )}
      </div>
    </div>
  )
}

const AssetTable: FC = () => {
  const { t } = useTranslation("admin")
  const { balances, balancesByTokenId: assetsByTokenId } = useRecoilValue(scanProgress)

  if (!balances.length) return null

  return (
    <div className="text-body flex w-full min-w-[45rem] flex-col gap-4 text-left text-base">
      <div className="text-body-disabled grid grid-cols-[30%_20%_25%_25%] px-8 text-sm font-normal">
        <div>{t("Asset")}</div>
        <div>{t("Network")}</div>
        <div className="text-right">{t("Balance")}</div>
        <div></div>
      </div>

      {Object.entries(assetsByTokenId).map(([tokenId, assets]) => (
        <AssetRow key={tokenId} tokenId={tokenId} assets={assets} />
      ))}
    </div>
  )
}

const Header: FC = () => {
  const { t } = useTranslation("admin")
  const { balances, accountsCount, tokensCount, percent, isInProgress } =
    useRecoilValue(scanProgress)
  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworks: activeNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { evmNetworks: allNetworks } = useEvmNetworks({ activeOnly: false, includeTestnets })

  const handleScanClick = useCallback(
    (mode: AssetDiscoveryMode) => async () => {
      const stop = log.timer("start scan")
      api.assetDiscoveryStartScan(mode)
      stop()
    },
    []
  )
  const handleCancelScanClick = useCallback(async () => {
    const stop = log.timer("stop scan")
    await api.assetDiscoveryStopScan()
    stop()
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

  const { balancesByTokenId, balances, isInProgress } = useRecoilValue(scanProgress)
  const { lastScanAccounts, lastScanTimestamp } = useRecoilValue(assetDiscoveryScanState)

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
        (token && evmNetwork && !isEvmNetworkActive(evmNetwork, activeEvmNetworks)) ||
        !isTokenActive(token, activeTokens)
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
          {t("Activate All")}
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

export const AssetDiscoveryPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const [showAssetDiscoveryAlert, setShowAssetDiscoveryAlert] =
    useAppState("showAssetDiscoveryAlert")

  // turn off new tokens found alert when user browses this page
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
      className="[&>section>div.relative]:max-w-[81rem]"
    >
      <HeaderBlock
        title={t("Asset Discovery")}
        text={t("Scan for well-known tokens in your accounts and add them to your wallet")}
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
