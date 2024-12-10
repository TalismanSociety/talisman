import keyring from "@polkadot/ui-keyring"
import PromisePool from "@supercharge/promise-pool"
import { erc20Abi, erc20BalancesAggregatorAbi, EvmErc20Token } from "@talismn/balances"
import { abiMulticall } from "@talismn/balances/src/modules/abis/multicall"
import { EvmNetwork, EvmNetworkId, Token, TokenId, TokenList } from "@talismn/chaindata-provider"
import { isEthereumAddress, throwAfter } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual, uniq } from "lodash"
import chunk from "lodash/chunk"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"
import { combineLatest, debounceTime, distinctUntilKeyChanged, skip } from "rxjs"
import { PublicClient } from "viem"

import { sentry } from "../../config/sentry"
import { db } from "../../db"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { isEvmToken } from "../../util/isEvmToken"
import { appStore } from "../app/store.app"
import { activeEvmNetworksStore, isEvmNetworkActive } from "../ethereum/store.activeEvmNetworks"
import { EvmAddress } from "../ethereum/types"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
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
const BALANCES_FETCH_CHUNK_SIZE = 1000

// native tokens should be processed and displayed first
const getSortableIdentifier = (tokenId: TokenId, address: string, tokens: TokenList) => {
  const token = tokens[tokenId]
  if (!token?.evmNetwork?.id) {
    log.warn("No token or network found for tokenId", tokenId)
    return `${tokenId}::${address}`
  }

  return `${token.evmNetwork?.id}::${
    tokens[tokenId].type === "evm-native" ? "t1" : "t2"
  }::${tokenId}::${address}`
}

class AssetDiscoveryScanner {
  #isBusy = false
  #preventAutoStart = false

  constructor() {
    this.watchNewAccounts()
    this.watchEnabledNetworks()
    this.resume()
  }

  private watchNewAccounts = async () => {
    await awaitKeyringLoaded()

    let prevAllAddresses: string[] | null = null

    // identify newly added accounts and scan those
    keyring.accounts.subject.pipe(debounceTime(500)).subscribe(async (accounts) => {
      try {
        const allAddresses = Object.keys(accounts)

        if (prevAllAddresses && !this.#preventAutoStart) {
          const addresses = allAddresses.filter((k) => !(prevAllAddresses as string[]).includes(k))
          const networkIds = await getActiveNetworkIdsToScan()

          log.debug("[AssetDiscovery] New accounts detected, starting scan", {
            addresses,
            networkIds,
          })

          this.startScan({ networkIds, addresses })
        }

        prevAllAddresses = allAddresses // update reference
      } catch (err) {
        log.error("[AssetDiscovery] Failed to start scan after account creation", { err })
      }
    })
  }

  private watchEnabledNetworks = async () => {
    let prevAllActiveNetworkIds: string[] | null = null

    // identify newly enabled networks and scan those
    combineLatest([chaindataProvider.evmNetworksByIdObservable, activeEvmNetworksStore.observable])
      .pipe(debounceTime(500))
      .subscribe(([networksById, activeNetworks]) => {
        try {
          const allActiveNetworkIds = Object.keys(activeNetworks).filter(
            (k) => !!activeNetworks[k] && networksById[k] && !networksById.isTestnet,
          )

          if (prevAllActiveNetworkIds && !this.#preventAutoStart) {
            const networkIds = allActiveNetworkIds.filter(
              (k) => !(prevAllActiveNetworkIds as string[]).includes(k),
            )
            const addresses = keyring.getAccounts().map((acc) => acc.address)

            log.debug("[AssetDiscovery] New enabled networks detected, starting scan", {
              addresses,
              networkIds,
            })

            this.startScan({ networkIds, addresses })
          }

          prevAllActiveNetworkIds = allActiveNetworkIds
        } catch (err) {
          log.error("[AssetDiscovery] Failed to start scan after active networks list changed", {
            err,
          })
        }
      })
  }

  private resume(): void {
    setTimeout(async () => {
      this.executeNextScan()
      // resume after 5 sec to not interfere with other startup routines
      // could be longer but because of MV3 it's better to start asap
    }, 5_000)
  }

  public async startScan(scope: AssetDiscoveryScanScope, dequeue?: boolean): Promise<boolean> {
    const evmNetworksMap = await chaindataProvider.evmNetworksById()

    // for now we only support ethereum addresses and networks
    const addresses = scope.addresses.filter((address) => isEthereumAddress(address))
    const networkIds = scope.networkIds.filter((id) => evmNetworksMap[id])
    if (!addresses.length || !networkIds.length) return false

    log.debug("[AssetDiscovery] Enqueue scan", { addresses, networkIds })

    // add to queue
    await assetDiscoveryStore.mutate((state) => ({
      ...state,
      queue: [...(state.queue ?? []), { addresses, networkIds }],
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

        await assetDiscoveryStore.mutate((state): AssetDiscoveryScanState => {
          const [next, ...others] = state.queue ?? []
          return {
            ...state,
            currentScanScope: next ?? null,
            currentScanProgressPercent: 0,
            currentScanTokensCount: 0,
            currentScanCursors: {},
            queue: others,
          }
        })
      }
    }
  }

  private async executeNextScan(): Promise<void> {
    if (this.#isBusy) return
    this.#isBusy = true

    const abortController = new AbortController()

    try {
      await this.dequeue()

      const scope = await assetDiscoveryStore.get("currentScanScope")
      if (!scope) return

      log.debug("[AssetDiscovery] Scanner proceeding with scan", scope)

      const { currentScanCursors: cursors } = await assetDiscoveryStore.get()

      const [allTokens, evmNetworks, activeTokens] = await Promise.all([
        chaindataProvider.tokens(),
        chaindataProvider.evmNetworksById(),
        activeTokensStore.get(),
      ])

      const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))

      const tokensToScan = allTokens
        .filter(isEvmToken)
        .filter((t) => scope.networkIds.includes(t.evmNetwork?.id ?? ""))
        .filter((token) => {
          const evmNetwork = evmNetworks[token.evmNetwork?.id ?? ""]
          if (!evmNetwork) return false
          if (evmNetwork.isTestnet || token.isTestnet) return false
          if (token.coingeckoId && IGNORED_COINGECKO_IDS.includes(token.coingeckoId)) return false
          if (token.noDiscovery) return false
          return !isTokenActive(token, activeTokens)
        })

      await assetDiscoveryStore.mutate((prev) => ({
        ...prev,
        currentScanTokensCount: tokensToScan.length,
      }))

      const tokensByNetwork: Record<EvmNetworkId, Token[]> = groupBy(
        tokensToScan,
        (t) => t.evmNetwork?.id,
      )

      const totalChecks = tokensToScan.length * scope.addresses.length
      const totalTokens = tokensToScan.length

      const subScopeChange = assetDiscoveryStore.observable
        .pipe(distinctUntilKeyChanged("currentScanScope", isEqual), skip(1))
        .subscribe(() => {
          abortController.abort()
          subScopeChange.unsubscribe()
        })

      const erc20aggregators = Object.fromEntries(
        Object.values(evmNetworks)
          .filter((n) => n.erc20aggregator)
          .map((n) => [n.id, n.erc20aggregator] as const),
      )

      // process multiple networks at a time
      await PromisePool.withConcurrency(MANUAL_SCAN_MAX_CONCURRENT_NETWORK)
        .for(Object.keys(tokensByNetwork))
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
            const chunkedChecks = chunk(remainingChecks, BALANCES_FETCH_CHUNK_SIZE)

            for (const checks of chunkedChecks) {
              // stop if scan was cancelled
              if (abortController.signal.aborted) return

              const res = await getEvmTokenBalances(
                client,
                checks.map((c) => ({
                  token: tokensMap[c.tokenId],
                  address: c.address as EvmAddress,
                })),
                erc20aggregators[networkId],
              )

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
            log.error(`[AssetDiscovery] Could not scan network ${networkId}`, { err })
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

      log.debug("[AssetDiscovery] Scan completed", scope)

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

  public async startPendingScan(): Promise<void> {
    const isAssetDiscoveryScanPending = await appStore.get("isAssetDiscoveryScanPending")
    if (!isAssetDiscoveryScanPending) return

    // addresses of all ethereum accounts
    await awaitKeyringLoaded()
    const addresses = keyring
      .getAccounts()
      .filter((acc) => isEthereumAddress(acc.address))
      .map((acc) => acc.address)

    // all active evm networks
    const [evmNetworks, activeEvmNetworks] = await Promise.all([
      chaindataProvider.evmNetworks(),
      activeEvmNetworksStore.get(),
    ])

    const networkIds = evmNetworks
      .filter((n) => isEvmNetworkActive(n, activeEvmNetworks))
      .map((n) => n.id)

    // enqueue scan
    this.startScan({ networkIds, addresses })

    await appStore.set({ isAssetDiscoveryScanPending: false })
  }

  private async enableDiscoveredTokens(): Promise<void> {
    this.#preventAutoStart = true

    try {
      const [discoveredBalances, activeEvmNetworks, activeTokens] = await Promise.all([
        db.assetDiscovery.toArray(),
        activeEvmNetworksStore.get(),
        activeTokensStore.get(),
      ])

      const tokenIds = uniq(discoveredBalances.map((entry) => entry.tokenId))
      const tokens = (
        await Promise.all(tokenIds.map((tokenId) => chaindataProvider.tokenById(tokenId)))
      ).filter(isEvmToken)

      const evmNetworkIds = uniq(
        tokens.map((token) => token.evmNetwork?.id).filter((id): id is EvmNetworkId => !!id),
      )
      const evmNetworks = (
        await Promise.all(evmNetworkIds.map((id) => chaindataProvider.evmNetworkById(id)))
      ).filter((network): network is EvmNetwork => !!network)

      // activate tokens that have not been explicitely disabled and that are not default tokens
      for (const token of tokens)
        if (activeTokens[token.id] === undefined && !isTokenActive(token, activeTokens)) {
          log.debug("[AssetDiscovery] Automatically enabling discovered asset", { token })
          activeTokensStore.setActive(token.id, true)
        }

      // activate networks that have not been explicitely disabled and that are not default networks
      for (const evmNetwork of evmNetworks)
        if (
          activeEvmNetworks[evmNetwork.id] === undefined &&
          !isEvmNetworkActive(evmNetwork, activeEvmNetworks)
        ) {
          log.debug("[AssetDiscovery] Automatically enabling discovered network", { evmNetwork })
          activeEvmNetworksStore.setActive(evmNetwork.id, true)
        }
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
    chaindataProvider.evmNetworks(),
    activeEvmNetworksStore.get(),
    // we dont scan substrate tokens for now
    // chaindataProvider.chains(),
    // activeChainsStore.get()
  ])

  return evmNetworks
    .filter((n) => !n.isTestnet && isEvmNetworkActive(n, activeEvmNetworks))
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
        sentry.captureException(err)
        log.error(`Failed to scan ${token.id} for ${address}: `, { err })
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

  const resByIndex: Record<number, string> = Object.fromEntries(
    erc20Balances
      .map((res, i) => [i, String(res)])
      .concat(otherBalances.map((res, i) => [i, String(res)])),
  )

  return indexedBalanceDefs.map((bd) => resByIndex[bd.index])
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
