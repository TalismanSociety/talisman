import PromisePool from "@supercharge/promise-pool"
import { abiMulticall, erc20BalancesAggregatorAbi } from "@talismn/balances"
import {
  EthNetworkId,
  EvmErc20Token,
  isTokenEth,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { isAccountNotContact, isAccountPlatformEthereum } from "@talismn/keyring"
import { isTruthy, sleep, throwAfter } from "@talismn/util"
import { log } from "extension-shared"
import { chunk, groupBy, isEqual, sortBy, uniq } from "lodash-es"
import {
  combineLatest,
  debounceTime,
  distinct,
  distinctUntilKeyChanged,
  filter,
  firstValueFrom,
  map,
  skip,
} from "rxjs"
import { erc20Abi, PublicClient } from "viem"

import { db } from "../../db"
import { isWalletReady$ } from "../../libs/isWalletReady"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { appStore } from "../app/store.app"
import { activeNetworksStore, isNetworkActive } from "../balances/store.activeNetworks"
import { activeTokensStore } from "../balances/store.activeTokens"
import { EvmAddress } from "../ethereum/types"
import { keyringStore } from "../keyring/store"
import { fetchMissingTokens } from "./fetchMissingTokens"
import { AssetDiscoveryScanState, assetDiscoveryStore } from "./store"
import { AssetDiscoveryScanScope, DiscoveredBalance } from "./types"

// TODO - flag these tokens as ignored from chaindata
const IGNORED_COINGECKO_IDS = [
  "position-token", // BSC - POSI
  "tangyuan", // BSC - TangYuan
  "malou", // BSC - NEVER

  "outter-finance", // BSC - OUT (temporary workaround, error breaks scans with Manifest V3)
  "peri-finance", // Mainnet - PERI (timeouts on balance reads)
]

const MANUAL_SCAN_MAX_CONCURRENT_NETWORK = 4
const BALANCES_FETCH_CHUNK_SIZE = 50
const NETWORK_BALANCES_FETCH_CHUNK_SIZE: Record<string, number> = {
  "1": 200,
}

// native tokens should be processed and displayed first
const getSortableIdentifier = (tokenId: TokenId, address: string, tokens: TokenList) => {
  const token = tokens[tokenId]
  if (!token?.networkId) {
    log.warn("No token or network found for tokenId", tokenId)
    return `${tokenId}::${address}`
  }

  return `${token.networkId}::${
    tokens[tokenId].type === "evm-native" ? "t1" : "t2"
  }::${tokenId}::${address}`
}

class AssetDiscoveryScanner {
  #isBusy = false
  #preventAutoStart = false

  constructor() {
    this.watchNewAccounts()
    this.watchEnabledNetworks()
    this.scanOnUnlock()
    this.resume()
  }

  private watchNewAccounts = async () => {
    let prevAllAddresses: string[] | null = null

    // identify newly added accounts and scan those
    combineLatest({ isWalletReady: isWalletReady$, accounts: keyringStore.accounts$ })
      .pipe(
        filter(({ isWalletReady }) => isWalletReady),
        map(({ accounts }) =>
          accounts
            .filter(isAccountNotContact)
            .map((account) => account.address)
            .sort(),
        ),
        distinct((addresses) => addresses.join("")),
      )
      .subscribe(async (allAddresses) => {
        try {
          if (prevAllAddresses && !this.#preventAutoStart) {
            const addresses = allAddresses.filter(
              (k) => !(prevAllAddresses as string[]).includes(k),
            )

            if (addresses.length) {
              const networkIds = await getActiveNetworkIdsToScan()

              log.debug("[AssetDiscovery] New accounts detected, starting scan", {
                addresses,
                networkIds,
              })

              await this.startScan({ networkIds, addresses, withApi: true })
            }
          }

          prevAllAddresses = allAddresses // update reference
        } catch (err) {
          log.error("[AssetDiscovery] Failed to start scan after account creation", { err })
        }
      })
  }

  private watchEnabledNetworks = () => {
    let prevAllActiveNetworkIds: string[] | null = null

    // identify newly enabled networks and scan those
    combineLatest({
      isWalletReady: isWalletReady$,
      networksById: chaindataProvider.getNetworksMapById$("ethereum"),
      activeNetworks: activeNetworksStore.observable,
    })
      .pipe(
        filter(({ isWalletReady }) => !!isWalletReady),
        map(({ networksById, activeNetworks }) =>
          Object.keys(activeNetworks)
            .filter((k) => !!activeNetworks[k] && networksById[k])
            .sort(),
        ),
        distinct((allActiveNetworkIds) => allActiveNetworkIds.join("")),
      )
      .subscribe(async (allActiveNetworkIds) => {
        try {
          if (prevAllActiveNetworkIds && !this.#preventAutoStart) {
            const networkIds = allActiveNetworkIds.filter(
              (k) => !(prevAllActiveNetworkIds as string[]).includes(k),
            )

            if (networkIds.length) {
              const accounts = await keyringStore.getAccounts()
              const addresses = accounts.filter(isAccountNotContact).map((acc) => acc.address)

              log.debug("[AssetDiscovery] New enabled networks detected, starting scan", {
                addresses,
                networkIds,
              })

              // `withApi: false` because api always scans all networks, we dont need to call it again
              await this.startScan({ networkIds, addresses, withApi: false })
            }
          }

          prevAllActiveNetworkIds = allActiveNetworkIds
        } catch (err) {
          log.error("[AssetDiscovery] Failed to start scan after active networks list changed", {
            err,
          })
        }
      })
  }

  private scanOnUnlock = () => {
    isWalletReady$ // true means user has logged in and migrations are complete (it doesnt mean that they succeded though)
      .pipe(filter(isTruthy), debounceTime(10_000))
      .subscribe(async () => {
        try {
          const accounts = await keyringStore.getAccounts()
          const addresses = accounts.filter(isAccountNotContact).map((acc) => acc.address)
          const networkIds = await getNetworkIdsToForceScan()

          if (!addresses.length || !networkIds.length) return

          // on wallet unlock, scan networks with forceScan:true
          // this helps discovery during growth campagins, where users are incentivized to send tokens from CEXs
          await this.startScan({ addresses, networkIds, withApi: true })
        } catch (err) {
          log.error("[AssetDiscovery] Failed to start scan on unlock", { err })
        }
      })
  }

  private resume(): void {
    setTimeout(() => {
      this.executeNextScan()
      // resume after 5 sec to not interfere with other startup routines
      // could be longer but because of MV3 it's better to start asap
    }, 5_000)
  }

  public async startScan(scope: AssetDiscoveryScanScope, dequeue?: boolean): Promise<boolean> {
    const evmNetworksMap = await chaindataProvider.getNetworksMapById("ethereum")

    // for now we only support ethereum addresses and networks
    const addresses = scope.addresses.filter((address) => isEthereumAddress(address))
    const networkIds = scope.networkIds.filter((id) => evmNetworksMap[id])
    if (!addresses.length || !networkIds.length) return false

    log.debug("[AssetDiscovery] Enqueue scan", { addresses, networkIds, dequeue })

    // add to queue
    await assetDiscoveryStore.mutate((state) => ({
      ...state,
      queue: [...(state.queue ?? []), { ...scope, addresses, networkIds }],
    }))

    // for front end calls, dequeue as part of this promise to keep UI in sync
    if (dequeue && !this.#isBusy) {
      this.#isBusy = true
      try {
        await this.dequeue()
      } finally {
        this.#isBusy = false
      }
    }

    this.executeNextScan()

    return true
  }

  public async stopScan(): Promise<boolean> {
    await assetDiscoveryStore.set({
      currentScanScope: null,
      currentScanProgressPercent: undefined,
      currentScanCursors: undefined,
      currentScanTokensCount: undefined,
      queue: [],
    })

    await db.assetDiscovery.clear()

    return true
  }

  private async dequeue(): Promise<void> {
    const scope = await assetDiscoveryStore.get("currentScanScope")

    if (!scope) {
      const queue = await assetDiscoveryStore.get("queue")
      if (queue?.length) {
        await this.enableDiscoveredTokens() // enable pending discovered tokens before flushing the table

        await db.assetDiscovery.clear()

        await assetDiscoveryStore.mutate((prev): AssetDiscoveryScanState => {
          // merge queue
          const queue = prev.queue ?? []
          const mergedScope: AssetDiscoveryScanScope = {
            addresses: uniq(queue.map((s) => s.addresses).flat()),
            networkIds: uniq(queue.map((s) => s.networkIds).flat()),
            withApi: queue.some((s) => s.withApi),
          }
          const currentScanScope =
            mergedScope.networkIds.length && mergedScope.addresses.length ? mergedScope : null

          return {
            ...prev,
            currentScanScope,
            currentScanProgressPercent: 0,
            currentScanTokensCount: 0,
            currentScanCursors: {},
            queue: [],
          }
        })
      }
    }
  }

  /** modifies the scope of next scan if necessary */
  private async getEffectiveCurrentScanScope(): Promise<AssetDiscoveryScanScope | null> {
    const scope = await assetDiscoveryStore.get("currentScanScope")
    if (!scope) return null

    if (!scope.withApi) return scope

    const foundTokenIds = await fetchMissingTokens(scope.addresses)

    const [allTokens, evmNetworks, activeTokens, activeNetworks] = await Promise.all([
      chaindataProvider.getTokens(),
      chaindataProvider.getNetworksMapById("ethereum"),
      activeTokensStore.get(),
      activeNetworksStore.get(),
    ])

    const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))

    // add all networks that contain an asset that was discovered and whose enabled status is not set yet
    // key idea: dont scan mainnet (8K tokens) unless a new token is found on it
    const additionalNetworkIds: string[] = foundTokenIds
      .map((tokenId) => tokensMap[tokenId])
      .filter((token) => {
        if (!token || token.noDiscovery) return false

        if (activeNetworks[token.networkId ?? ""] === false) return false

        switch (token.type) {
          case "evm-erc20":
          case "evm-native":
            return activeTokens[token.id] === undefined
          default:
            return false
        }
      })
      .map((t) => {
        log.debug("[AssetDiscovery] Forcing scan because of", t.id)
        return t.networkId
      })
      .filter((id): id is string => !!id)

    const networkIdsToScan = [...new Set([...scope.networkIds, ...additionalNetworkIds])]

    const tokensToScan = allTokens
      .filter(isTokenEth)
      .filter((t) => networkIdsToScan.includes(t.networkId ?? ""))
      .filter((token) => {
        const evmNetwork = evmNetworks[token.networkId ?? ""]
        if (!evmNetwork) return false
        if (!evmNetwork.forceScan && evmNetwork.isTestnet) return false
        if (token.coingeckoId && IGNORED_COINGECKO_IDS.includes(token.coingeckoId)) return false
        if (token.noDiscovery) return false
        // scan only if token has never been enabled or disabled
        return activeTokens[token.id] === undefined
      })

    await assetDiscoveryStore.mutate((prev) => ({
      ...prev,
      currentScanScope: {
        ...(prev.currentScanScope ?? { addresses: scope.addresses }),
        networkIds: networkIdsToScan,
        withApi: false, // dot not call api again if scan is stopped then resumed
      },
      currentScanTokensCount: tokensToScan.length,
    }))

    // refresh scope and return
    return await assetDiscoveryStore.get("currentScanScope")
  }

  private async executeNextScan(): Promise<void> {
    if (this.#isBusy) return
    this.#isBusy = true

    const abortController = new AbortController()

    try {
      await this.dequeue()

      const scope = await this.getEffectiveCurrentScanScope()
      if (!scope) return

      log.debug("[AssetDiscovery] Scanner proceeding with scan", scope)

      const { currentScanCursors: cursors } = await assetDiscoveryStore.get()

      const [allTokens, evmNetworks, activeTokens] = await Promise.all([
        chaindataProvider.getTokens(),
        chaindataProvider.getNetworksMapById("ethereum"),
        activeTokensStore.get(),
        activeNetworksStore.get(),
      ])

      const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))

      const tokensToScan = allTokens
        .filter(isTokenEth)
        .filter((t) => scope.networkIds.includes(t.networkId ?? ""))
        .filter((token) => {
          const evmNetwork = evmNetworks[token.networkId ?? ""]
          if (!evmNetwork) return false
          if (!evmNetwork.forceScan && evmNetwork.isTestnet) return false
          if (token.coingeckoId && IGNORED_COINGECKO_IDS.includes(token.coingeckoId)) return false
          if (token.noDiscovery) return false
          // scan only if token has never been enabled or disabled
          return activeTokens[token.id] === undefined
        })

      const tokensByNetwork: Record<EthNetworkId, Token[]> = groupBy(
        tokensToScan,
        (t) => t.networkId,
      )

      const totalChecks = tokensToScan.length * scope.addresses.length
      const totalTokens = tokensToScan.length

      log.debug(
        "[AssetDiscovery] Starting scan: %d tokens, %d total checks",
        totalTokens,
        totalChecks,
        { networkIds: scope.networkIds },
      )

      const subScopeChange = assetDiscoveryStore.observable
        .pipe(distinctUntilKeyChanged("currentScanScope", isEqual), skip(1))
        .subscribe(() => {
          log.debug("[AssetDiscovery] Scan cancelled due to currentScanScope change")
          subScopeChange.unsubscribe()
          abortController.abort()
        })

      const erc20aggregators = Object.fromEntries(
        Object.values(evmNetworks)
          .filter((n) => n.contracts?.Erc20Aggregator)
          .map((n) => [n.id, n.contracts?.Erc20Aggregator] as const),
      )

      const stop = log.timer("[AssetDiscovery] Scan completed")

      // process multiple networks at a time
      await PromisePool.withConcurrency(MANUAL_SCAN_MAX_CONCURRENT_NETWORK)
        .for(Object.keys(tokensByNetwork).sort((a, b) => Number(a) - Number(b)))
        .process(async (networkId) => {
          // stop if scan was cancelled
          if (abortController.signal.aborted) return

          try {
            const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
            if (!client) return

            // build the list of token+address to check balances for
            const allChecks = sortBy(
              tokensByNetwork[networkId]
                .map((t) =>
                  scope.addresses.map((a) => ({ tokenId: t.id, type: t.type, address: a })),
                )
                .flat(),
              (c) => getSortableIdentifier(c.tokenId, c.address, tokensMap),
            )

            let startIndex = 0

            // skip checks that were already scanned
            if (cursors[networkId]) {
              const { tokenId, address } = cursors[networkId]
              startIndex =
                1 + allChecks.findIndex((c) => c.tokenId === tokenId && c.address === address)
            }

            const remainingChecks = allChecks.slice(startIndex)

            //Split into chunks of 50 token+id
            const chunkedChecks = chunk(
              remainingChecks,
              NETWORK_BALANCES_FETCH_CHUNK_SIZE[networkId] ?? BALANCES_FETCH_CHUNK_SIZE,
            )

            for (const checks of chunkedChecks) {
              // stop if scan was cancelled
              if (abortController.signal.aborted) return

              const res = await Promise.race([
                getEvmTokenBalances(
                  client,
                  checks.map((c) => ({
                    token: tokensMap[c.tokenId],
                    address: c.address as EvmAddress,
                  })),
                  erc20aggregators[networkId],
                ),
                throwAfter(10_000, "Timeout"),
              ])

              // stop if scan was cancelled
              if (abortController.signal.aborted) return

              const newBalances = checks
                .map((check, i) => [check, res[i]] as const)
                .filter(([, res]) => res !== "0")
                .map<DiscoveredBalance>(([{ address, tokenId }, res]) => ({
                  id: getSortableIdentifier(tokenId, address, tokensMap),
                  tokenId,
                  address,
                  balance: res,
                }))

              await assetDiscoveryStore.mutate((prev) => {
                if (abortController.signal.aborted) return prev

                const currentScanCursors = {
                  ...prev.currentScanCursors,
                  [networkId]: {
                    address: checks[checks.length - 1].address,
                    tokenId: checks[checks.length - 1].tokenId,
                    scanned: (prev.currentScanCursors[networkId]?.scanned ?? 0) + checks.length,
                  },
                }

                // Update progress
                // in case of full scan it takes longer to scan networks
                // in case of active scan it takes longer to scan tokens
                // => use the min of both ratios as current progress
                const totalScanned = Object.values(currentScanCursors).reduce(
                  (acc, cur) => acc + cur.scanned,
                  0,
                )
                const tokensProgress = Math.round((100 * totalScanned) / totalChecks)
                const networksProgress = Math.round(
                  (100 * Object.keys(currentScanCursors).length) /
                    Object.keys(tokensByNetwork).length,
                )
                const currentScanProgressPercent = Math.min(tokensProgress, networksProgress)

                return {
                  ...prev,
                  currentScanCursors,
                  currentScanProgressPercent,
                  currentScanTokensCount: totalTokens,
                }
              })

              if (abortController.signal.aborted) return

              if (newBalances.length) {
                await db.assetDiscovery.bulkPut(newBalances)
              }
            }
          } catch (err) {
            log.warn(`[AssetDiscovery] Could not scan network ${networkId}`, { err })
          }
        })

      await assetDiscoveryStore.mutate((prev): AssetDiscoveryScanState => {
        if (abortController.signal.aborted) return prev
        return {
          ...prev,
          currentScanProgressPercent: 100,
          currentScanScope: null,
          lastScanTimestamp: Date.now(),
          lastScanAccounts: prev.currentScanScope?.addresses ?? [],
          lastScanNetworks: prev.currentScanScope?.networkIds ?? [],
          lastScanTokensCount: prev.currentScanTokensCount,
        }
      })

      subScopeChange.unsubscribe()

      stop()

      await this.enableDiscoveredTokens() // if pending tokens to enable, do it now
    } catch (cause) {
      abortController.abort()
      log.error("Error while scanning", { cause })
    } finally {
      this.#isBusy = false
    }

    // proceed with next scan in queue, if any
    this.executeNextScan()
  }

  /** Used bym migrations */
  public async startPendingScan(): Promise<void> {
    if (!(await firstValueFrom(isWalletReady$))) return

    const isAssetDiscoveryScanPending = await appStore.get("isAssetDiscoveryScanPending")
    if (!isAssetDiscoveryScanPending) return

    // addresses of all ethereum accounts
    const accounts = await keyringStore.getAccounts()
    const addresses = accounts
      .filter(isAccountNotContact)
      .filter(isAccountPlatformEthereum)
      .map((acc) => acc.address)

    // all active evm networks
    const [evmNetworks, activeNetworks] = await Promise.all([
      chaindataProvider.getNetworks("ethereum"),
      activeNetworksStore.get(),
    ])

    const networkIds = evmNetworks
      .filter((n) => isNetworkActive(n, activeNetworks))
      .map((n) => n.id)

    await appStore.set({ isAssetDiscoveryScanPending: false })

    // enqueue scan
    await this.startScan({ networkIds, addresses, withApi: true })
  }

  private async enableDiscoveredTokens(): Promise<void> {
    this.#preventAutoStart = true

    try {
      const [discoveredBalances] = await Promise.all([db.assetDiscovery.toArray()])

      const tokenIds = uniq(discoveredBalances.map((entry) => entry.tokenId))
      const tokens = (
        await Promise.all(tokenIds.map((tokenId) => chaindataProvider.getTokenById(tokenId)))
      ).filter(isTokenEth)
      await activeTokensStore.set(Object.fromEntries(tokens.map((t) => [t.id, true])))

      const evmNetworkIds = uniq(tokens.map((token) => token.networkId))
      await activeNetworksStore.set(
        Object.fromEntries(evmNetworkIds.map((networkId) => [networkId, true])),
      )

      await sleep(100) // pause to ensure local storage observables fires before we exit, to prevent unnecessary scans to be triggered (see watchEnabledNetworks up top)
    } catch (err) {
      log.error("[AssetDiscovery] Failed to automatically enable discovered assets", {
        err,
      })
    }

    this.#preventAutoStart = false
  }
}

const getActiveNetworkIdsToScan = async () => {
  const [evmNetworks, activeEvmNetworks] = await Promise.all([
    chaindataProvider.getNetworks("ethereum"),
    activeNetworksStore.get(),
  ])

  return evmNetworks
    .filter((n) => n.forceScan || (!n.isTestnet && isNetworkActive(n, activeEvmNetworks))) // note: forceScan must also work on testnets
    .map((n) => n.id)
}

const getNetworkIdsToForceScan = async () => {
  const [evmNetworks, activeEvmNetworks] = await Promise.all([
    chaindataProvider.getNetworks("ethereum"),
    activeNetworksStore.get(),
  ])

  return evmNetworks
    .filter((n) => n.forceScan && activeEvmNetworks[n.id] !== false) // note: forceScan must also work on testnets
    .map((n) => n.id)
}

const getEvmTokenBalance = async (client: PublicClient, token: Token, address: EvmAddress) => {
  if (token.type === "evm-erc20" || token.type === "evm-uniswapv2") {
    const balance = await client.readContract({
      abi: erc20Abi,
      address: token.contractAddress as EvmAddress,
      functionName: "balanceOf",
      args: [address],
    })
    return balance.toString()
  }

  if (token.type === "evm-native") {
    const addressMulticall = client.chain?.contracts?.multicall3?.address
    if (addressMulticall) {
      // if multicall is available then fetch balance using this contract call,
      // this will allow the client to batch it along with other pending erc20 calls
      const balance = await client.readContract({
        abi: abiMulticall,
        address: addressMulticall,
        functionName: "getEthBalance",
        args: [address],
      })
      return balance.toString()
    }

    const balance = await client.getBalance({
      address,
    })
    return balance.toString()
  }

  throw new Error("Unsupported token type")
}

type BalanceDef = { token: Token; address: EvmAddress }

const getEvmTokenBalancesWithoutAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef[],
) => {
  if (balanceDefs.length === 0) return []

  return await Promise.all(
    balanceDefs.map(async ({ token, address }) => {
      try {
        let retries = 0
        while (retries < 3) {
          try {
            return await Promise.race([
              getEvmTokenBalance(client, token, address as EvmAddress),
              throwAfter(20_000, "Timeout"),
            ])
          } catch (err) {
            if ((err as Error).message === "Timeout") retries++
            else throw err
          }
        }

        throw new Error(`Failed to scan ${token.id} (Timeout)`)
      } catch (err) {
        log.warn(`[AssetDiscovery] Failed to get balance of ${token.id} for ${address}: `, { err })
        return "0"
      }
    }),
  )
}

const getEvmTokenBalancesWithAggregator = async (
  client: PublicClient,
  balanceDefs: BalanceDef[],
  aggregatorAddress: EvmAddress,
) => {
  if (balanceDefs.length === 0) return []

  // keep track of index so we can split queries and rebuild the original order afterwards
  const indexedBalanceDefs = balanceDefs.map((bd, index) => ({ ...bd, index }))
  const erc20BalanceDefs = indexedBalanceDefs.filter(
    (b) => b.token.type === "evm-erc20" || b.token.type === "evm-uniswapv2",
  )
  const otherBalanceDefs = indexedBalanceDefs.filter(
    (b) => b.token.type !== "evm-erc20" && b.token.type !== "evm-uniswapv2",
  )

  const [erc20Balances, otherBalances] = await Promise.all([
    client.readContract({
      abi: erc20BalancesAggregatorAbi,
      address: aggregatorAddress,
      functionName: "balances",
      args: [
        erc20BalanceDefs.map((b) => ({
          account: b.address,
          token: (b.token as EvmErc20Token).contractAddress as EvmAddress,
        })),
      ],
    }),
    getEvmTokenBalancesWithoutAggregator(client, otherBalanceDefs),
  ])

  const resByIndex = new Map<number, string>(
    erc20Balances
      .map((res, i) => [erc20BalanceDefs[i].index, String(res)] as [number, string])
      .concat(otherBalances.map((res, i) => [otherBalanceDefs[i].index, String(res)])),
  )

  return balanceDefs.map((_bd, i) => resByIndex.get(i)!)
}

const getEvmTokenBalances = (
  client: PublicClient,
  balanceDefs: BalanceDef[],
  aggregatorAddress: EvmAddress | undefined,
) => {
  return aggregatorAddress
    ? getEvmTokenBalancesWithAggregator(client, balanceDefs, aggregatorAddress)
    : getEvmTokenBalancesWithoutAggregator(client, balanceDefs)
}

export const assetDiscoveryScanner = new AssetDiscoveryScanner()
