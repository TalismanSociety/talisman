import { db } from "@core/db"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { DiscoveredBalance } from "@core/domains/assetDiscovery/types"
import {
  enabledEvmNetworksStore,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { enabledTokensStore, isTokenEnabled } from "@core/domains/tokens/store.enabledTokens"
import { TokenId } from "@core/domains/tokens/types"
import { log } from "@core/log"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { Address, BalanceFormatter } from "@talismn/balances"
import { EvmNetworkId, TokenList } from "@talismn/chaindata-provider"
import { ChevronDownIcon, DiamondIcon, InfoIcon, PlusIcon, SearchIcon, XIcon } from "@talismn/icons"
import { fetchTokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEnabledEvmNetworksState } from "@ui/hooks/useEnabledEvmNetworksState"
import { useEnabledTokensState } from "@ui/hooks/useEnabledTokensState"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import useTokens from "@ui/hooks/useTokens"
import { liveQuery } from "dexie"
import groupBy from "lodash/groupBy"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { atom, selector, useRecoilValue } from "recoil"
import { debounceTime, first, from, merge } from "rxjs"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { AccountsStack } from "./Accounts/AccountIconsStack"

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
      currentScanProgressPercent: percent,
      currentScanAccounts: accounts,
      currentScanTokensCount: tokensCount,
      currentScanId,
    } = get(assetDiscoveryScanState)
    const balances = get(assetDiscoveryBalancesState)

    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokenIds = Object.keys(balancesByTokenId)

    return {
      percent,
      balances,
      balancesByTokenId,
      tokensCount,
      accounts,
      accountsCount: accounts.length,
      isInProgress: !!currentScanId,
      tokenIds,
    }
  },
})

const TOKEN_RATES_CACHE: TokenList = {}

// our main token rates store only fetches enabled tokens, this obviously doesn't work here
const useDiscoveredTokenRates = () => {
  const { tokenIds } = useRecoilValue(scanProgress)
  const { tokens } = useTokens("all")
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

const AssetRow: FC<{ tokenId: TokenId; assets: DiscoveredBalance[] }> = ({ tokenId, assets }) => {
  const { t } = useTranslation("admin")
  const token = useToken(tokenId)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const tokenRates = useDiscoveredTokenRate(token?.id)
  const enabledEvmNetworks = useEnabledEvmNetworksState()
  const enabledTokens = useEnabledTokensState()

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

  const isEnabled = useMemo(
    () =>
      evmNetwork &&
      token &&
      isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks) &&
      isTokenEnabled(token, enabledTokens),
    [enabledEvmNetworks, enabledTokens, evmNetwork, token]
  )

  const enable = useCallback(() => {
    if (!token || !evmNetwork) return
    enabledEvmNetworksStore.setEnabled(evmNetwork.id, true)
    enabledTokensStore.setEnabled(token.id, true)
  }, [evmNetwork, token])

  const isInactiveNetwork = useMemo(
    () => evmNetwork && !isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks),
    [enabledEvmNetworks, evmNetwork]
  )

  if (!token || !evmNetwork) return null

  return (
    <div className="bg-grey-900 grid h-32 grid-cols-[30%_25%_30%_15%] items-center rounded-sm px-8">
      <div className="flex items-center gap-6">
        <div>
          <TokenLogo tokenId={tokenId} className="shrink-0 text-xl" />
        </div>
        <div className="flex flex-col gap-1">
          <div>{token.symbol}</div>
          <div>
            <AccountsStack accounts={accounts} />
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
      <div className="pl-4 text-right">
        <Button small disabled={isEnabled} onClick={enable} primary className="h-16 rounded-sm">
          {t("Activate")}
        </Button>
      </div>
    </div>
  )
}

const AssetTable: FC = () => {
  const { t } = useTranslation("admin")

  // force loading these atoms to resolve the suspense, this prevent flickering when rows appears
  useTokens("enabledWithoutTestnets")
  useEvmNetworks("enabledWithoutTestnets")
  useTokenRates()

  const { balances, balancesByTokenId: assetsByTokenId } = useRecoilValue(scanProgress)

  if (!balances.length) return null

  return (
    <div className="text-body flex w-full min-w-[45rem] flex-col gap-4 text-left text-base">
      <div className="text-body-disabled grid grid-cols-[30%_25%_30%_15%] px-8 text-sm font-normal">
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

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Asset Discovery",
  featureVersion: 1,
  page: "Settings - Asset Discovery",
}

const Header: FC = () => {
  const { t } = useTranslation("admin")
  const { balances, accountsCount, tokensCount, percent, isInProgress } =
    useRecoilValue(scanProgress)

  const handleScanClick = useCallback(
    (full: boolean) => async () => {
      const stop = log.timer("start scan")
      await api.assetDiscoveryStartScan(full)
      stop()
    },
    []
  )
  const handleCaancelScanClick = useCallback(async () => {
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
                  ? t("Scanning {{tokensCount}} tokens for {{accountsCount}} accounts", {
                      tokensCount,
                      accountsCount,
                    })
                  : t("Scanned {{tokensCount}} tokens for {{accountsCount}} accounts", {
                      tokensCount,
                      accountsCount,
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
          onClick={handleCaancelScanClick}
          iconLeft={XIcon}
          className="h-16 min-w-[10.5rem] rounded-full px-4 pr-6"
        >
          {t("Cancel")}
        </Button>
      ) : (
        <Button
          small
          primary
          onClick={handleScanClick(true)}
          className="h-16 min-w-[10.5rem] rounded-full px-4 pr-6 [&>div>div]:flex [&>div>div]:h-full [&>div>div]:items-center [&>div>div]:gap-2 [&>div]:h-full"
        >
          <SearchIcon className="text-base" />
          <div className="text-sm">{t("Scan")}</div>
          <div className="mx-1 h-full w-0.5 shrink-0 bg-black/10"></div>
          <ChevronDownIcon className="text-base" />
        </Button>
      )}
    </div>
  )
}

const ScanInfo: FC = () => {
  const { t } = useTranslation("admin")

  const { balancesByTokenId, balances } = useRecoilValue(scanProgress)
  const { currentScanId, lastScanAccounts, lastScanTimestamp } =
    useRecoilValue(assetDiscoveryScanState)

  const enabledEvmNetworks = useEnabledEvmNetworksState()
  const enabledTokens = useEnabledTokensState()
  const { tokensMap } = useTokens("all")
  const { evmNetworksMap } = useEvmNetworks("all")

  const canEnable = useMemo(() => {
    const tokenIds = Object.keys(balancesByTokenId)
    return tokenIds.some((tokenId) => {
      const token = tokensMap[tokenId]
      const evmNetwork = evmNetworksMap[token?.evmNetwork?.id ?? ""]
      return (
        (token && evmNetwork && !isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks)) ||
        !isTokenEnabled(token, enabledTokens)
      )
    })
  }, [balancesByTokenId, enabledEvmNetworks, enabledTokens, evmNetworksMap, tokensMap])

  const enableAll = useCallback(async () => {
    const tokenIds = Object.keys(balancesByTokenId)
    const evmNetworkIds = [
      ...new Set(tokenIds.map((tokenId) => tokensMap[tokenId]?.evmNetwork?.id).filter(Boolean)),
    ] as EvmNetworkId[]
    await enabledEvmNetworksStore.set(Object.fromEntries(evmNetworkIds.map((id) => [id, true])))
    await enabledTokensStore.set(Object.fromEntries(tokenIds.map((id) => [id, true])))
  }, [balancesByTokenId, tokensMap])

  const description = useMemo(() => {
    if (currentScanId) return t("Scan in progress...")
    if (lastScanTimestamp && lastScanAccounts.length) {
      const date = new Date(lastScanTimestamp)
      return t("Last scanned {{accountsCount}} accounts at {{timestamp}}", {
        accountsCount: lastScanAccounts.length,
        timestamp: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      })
    }
    return null
  }, [lastScanAccounts.length, lastScanTimestamp, currentScanId, t])

  return (
    <div className="flex h-16 w-full items-center px-8">
      <div className="text-body-disabled grow">{description}</div>
      {!!balances.length && (
        <Button
          disabled={!canEnable}
          onClick={enableAll}
          className="h-16"
          iconLeft={PlusIcon}
          small
          primary
        >
          {t("Activate all tokens")}
        </Button>
      )}
    </div>
  )
}

export const AssetDiscoveryPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)

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
        text={
          <Trans
            t={t}
            defaults="Scan for well-known tokens in your accounts and add them to Talisman"
          />
        }
      />
      <Spacer large />
      <Header />
      <Spacer small />
      <ScanInfo />
      <Spacer large />
      <AssetTable />
    </DashboardLayout>
  )
}
