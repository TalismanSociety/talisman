import { db } from "@core/db"
import { AccountJsonAny } from "@core/domains/accounts/types"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "@core/domains/assetDiscovery/store"
import { AssetDiscoveryResult } from "@core/domains/assetDiscovery/types"
import {
  enabledEvmNetworksStore,
  isEvmNetworkEnabled,
} from "@core/domains/ethereum/store.enabledEvmNetworks"
import { enabledTokensStore, isTokenEnabled } from "@core/domains/tokens/store.enabledTokens"
import { TokenId } from "@core/domains/tokens/types"
import { log } from "@core/log"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { Spacer } from "@talisman/components/Spacer"
import { BalanceFormatter } from "@talismn/balances"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { ChevronDownIcon, DiamondIcon, InfoIcon, PlusIcon, SearchIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
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

const assetDiscoveryResultsState = atom<AssetDiscoveryResult[]>({
  key: "assetDiscoveryResultsState",
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
  scanned: number
  total: number
  percent: number
  balances: AssetDiscoveryResult[]
  balancesByTokenId: Record<TokenId, AssetDiscoveryResult[]>
  tokensCount: number
  accountsCount: number
  isInProgress: boolean
}>({
  key: "scanProgress",
  get: ({ get }) => {
    const results = get(assetDiscoveryResultsState)
    const total = results.length
    const scanned = results.filter((r) => r.status !== "pending").length
    const balances = results.filter((r) => r.balance !== null && r.balance !== "0")
    const balancesByTokenId = groupBy(balances, (a) => a.tokenId)
    const tokensCount = [...new Set(results.map((r) => r.tokenId))].length
    const accountsCount = [...new Set(results.map((r) => r.address))].length
    const isInProgress = scanned !== total
    return {
      scanned,
      total,
      percent: Math.round((scanned / total) * 100),
      balances,
      balancesByTokenId,
      tokensCount,
      accountsCount,
      isInProgress,
    }
  },
})

const AssetRow: FC<{ tokenId: TokenId; assets: AssetDiscoveryResult[] }> = ({
  tokenId,
  assets,
}) => {
  const { t } = useTranslation("admin")
  const token = useToken(tokenId)
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const tokenRates = useTokenRates(token?.id)
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

  const { total, balancesByTokenId: assetsByTokenId } = useRecoilValue(scanProgress)

  if (!total) return null

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
  const { scanned, total, tokensCount, accountsCount, percent, isInProgress } =
    useRecoilValue(scanProgress)

  const handleScanClick = useCallback(
    (full: boolean) => async () => {
      const stop = log.timer("start scan")
      await api.assetDiscoveryStartScan(full)
      stop()
    },
    []
  )

  return (
    <div className="bg-grey-850 flex h-[8.6rem] items-center gap-8 rounded-sm px-8">
      <DiamondIcon
        className={classNames("text-lg", total ? "text-primary" : "text-body-secondary")}
      />
      <div className="flex grow flex-col gap-4 pr-10">
        {total ? (
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
                className="bg-primary-500 absolute left-0 top-0 h-4 w-full rounded-lg transition-transform duration-300 ease-out"
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
      <button
        onClick={handleScanClick(true)}
        className="bg-primary flex h-16 items-center gap-2 rounded-full px-4 text-xs text-black"
      >
        <SearchIcon className="text-base" />
        <div className="text-sm">{t("Scan")}</div>
        <div className="mx-1 h-full w-0.5 bg-black/10"></div>
        <ChevronDownIcon className="text-base" />
      </button>
    </div>
  )
}

const ScanInfo: FC = () => {
  const { t } = useTranslation("admin")

  const {
    balancesByTokenId: assetsByTokenId,
    total,
    scanned,
    isInProgress,
  } = useRecoilValue(scanProgress)
  const { status, lastScanAccounts, lastScanTimestamp } = useRecoilValue(assetDiscoveryScanState)

  const enabledEvmNetworks = useEnabledEvmNetworksState()
  const enabledTokens = useEnabledTokensState()
  const { tokensMap } = useTokens("all")
  const { evmNetworksMap } = useEvmNetworks("all")

  const canEnable = useMemo(() => {
    const tokenIds = Object.keys(assetsByTokenId)
    return tokenIds.some((tokenId) => {
      const token = tokensMap[tokenId]
      const evmNetwork = evmNetworksMap[token?.evmNetwork?.id ?? ""]
      return (
        (token && evmNetwork && !isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks)) ||
        !isTokenEnabled(token, enabledTokens)
      )
    })
  }, [assetsByTokenId, enabledEvmNetworks, enabledTokens, evmNetworksMap, tokensMap])

  const enableAll = useCallback(async () => {
    const tokenIds = Object.keys(assetsByTokenId)
    const evmNetworkIds = [
      ...new Set(tokenIds.map((tokenId) => tokensMap[tokenId]?.evmNetwork?.id).filter(Boolean)),
    ] as EvmNetworkId[]
    await enabledEvmNetworksStore.set(Object.fromEntries(evmNetworkIds.map((id) => [id, true])))
    await enabledTokensStore.set(Object.fromEntries(tokenIds.map((id) => [id, true])))
  }, [assetsByTokenId, tokensMap])

  const description = useMemo(() => {
    if (status === "scanning") return t("Scan in progress...")
    if (lastScanTimestamp && lastScanAccounts.length) {
      const date = new Date(lastScanTimestamp)
      return t("Last scanned {{accountsCount}} accounts at {{timestamp}}", {
        accountsCount: lastScanAccounts.length,
        timestamp: `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
      })
    }
    return null
  }, [lastScanAccounts.length, lastScanTimestamp, status, t])

  return (
    <div className="flex h-16 w-full items-center px-8">
      <div className="text-body-disabled grow">{description}</div>
      {!!total && (
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
