import keyring from "@polkadot/ui-keyring"
import PromisePool from "@supercharge/promise-pool"
import { erc20Abi } from "@talismn/balances"
import { abiMulticall } from "@talismn/balances/src/modules/abis/multicall"
import { EvmNetworkId, Token, TokenId, TokenList } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { log } from "extension-shared"
import chunk from "lodash/chunk"
import groupBy from "lodash/groupBy"
import sortBy from "lodash/sortBy"

import { db } from "../../db"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { isEvmToken } from "../../util/isEvmToken"
import { appStore } from "../app/store.app"
import { settingsStore } from "../app/store.settings"
import { activeEvmNetworksStore, isEvmNetworkActive } from "../ethereum/store.activeEvmNetworks"
import { EvmAddress } from "../ethereum/types"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import { assetDiscoveryStore } from "./store"
import { AssetDiscoveryMode, DiscoveredBalance, RequestAssetDiscoveryStartScan } from "./types"

// TODO - flag these tokens as ignored from chaindata
const IGNORED_COINGECKO_IDS = [
  "position-token", // BSC - POSI
  "tangyuan", // BSC - TangYuan
  "malou", // BSC - NEVER

  "outter-finance", // BSC - OUT (temporary workaround, error breaks scans with Manifest V3)
]

const MANUAL_SCAN_MAX_CONCURRENT_NETWORK = 4
const BALANCES_FETCH_CHUNK_SIZE = 100

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
  // as scan can be both manually started and resumed on startup (2 triggers),
  // track resumed scans to prevent them from running twice simultaneously
  #resumedScans: string[] = []

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    setTimeout(async () => {
      this.resumeScan()
      // resume after 15 sec to not interfere with other startup routines
    }, 15_000)
  }

  public async startScan({ mode, addresses }: RequestAssetDiscoveryStartScan): Promise<boolean> {
    const prevState = await assetDiscoveryStore.get()

    if (prevState.currentScanId) {
      // if a scan was already in progress it will be cancelled, merge previous and new addresses
      addresses = [...prevState.currentScanAccounts, ...(addresses ?? [])]
    }

    await awaitKeyringLoaded()
    const currentScanAccounts = keyring
      .getAccounts()
      .filter((acc) => isEthereumAddress(acc.address)) // only scan ethereum accounts, for now
      .map((acc) => acc.address)
      .filter((address) => !addresses || addresses.includes(address))

    // if no scan-compatible address, exit
    if (!currentScanAccounts.length) return false

    // 1. Set scan status in state
    await assetDiscoveryStore.set({
      currentScanId: crypto.randomUUID(),
      currentScanMode: mode,
      currentScanProgressPercent: 0,
      currentScanCursors: {},
      currentScanAccounts,
      currentScanTokensCount: 0,
    })

    // 2. Clear scan table
    await db.assetDiscovery.clear()

    // 3. Inform the user that a scan is in progress
    await appStore.set({
      showAssetDiscoveryAlert: true,
      dismissedAssetDiscoveryAlertScanId: "",
    })

    // 3. Start scan
    this.resumeScan()

    return true
  }

  public async stopScan(): Promise<boolean> {
    await assetDiscoveryStore.set({ currentScanId: null })
    await db.assetDiscovery.clear()

    return true
  }

  private async resumeScan(): Promise<void> {
    const currentScanId = await assetDiscoveryStore.get("currentScanId")
    if (!currentScanId) return

    // ensure a scan can't run twice in parallel
    if (this.#resumedScans.includes(currentScanId)) return
    this.#resumedScans.push(currentScanId)

    const {
      currentScanMode: mode,
      currentScanAccounts: addresses,
      currentScanCursors: cursors,
    } = await assetDiscoveryStore.get()

    const [allTokens, evmNetworks, activeTokens, activeEvmNetworks, settings] = await Promise.all([
      chaindataProvider.tokens(),
      chaindataProvider.evmNetworksById(),
      activeTokensStore.get(),
      activeEvmNetworksStore.get(),
      settingsStore.get(),
    ])

    const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))

    const tokensToScan = allTokens.filter(isEvmToken).filter((token) => {
      const evmNetwork = evmNetworks[token.evmNetwork?.id ?? ""]
      if (!evmNetwork) return false
      if (!settings.useTestnets && (evmNetwork.isTestnet || token.isTestnet)) return false
      if (token.coingeckoId && IGNORED_COINGECKO_IDS.includes(token.coingeckoId)) return false
      if (mode === AssetDiscoveryMode.ALL_NETWORKS)
        return (
          !isEvmNetworkActive(evmNetwork, activeEvmNetworks) || !isTokenActive(token, activeTokens)
        )
      return (
        isEvmNetworkActive(evmNetwork, activeEvmNetworks) && !isTokenActive(token, activeTokens)
      )
    })

    const tokensByNetwork: Record<EvmNetworkId, Token[]> = groupBy(
      tokensToScan,
      (t) => t.evmNetwork?.id
    )

    const totalChecks = tokensToScan.length * addresses.length
    const totalTokens = tokensToScan.length

    // process multiple networks at a time
    await PromisePool.withConcurrency(MANUAL_SCAN_MAX_CONCURRENT_NETWORK)
      .for(Object.keys(tokensByNetwork))
      .process(async (networkId) => {
        if (currentScanId !== (await assetDiscoveryStore.get("currentScanId"))) return
        try {
          const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
          if (!client) return

          // build the list of token+address to check balances for
          const allChecks = sortBy(
            tokensByNetwork[networkId]
              .map((t) => addresses.map((a) => ({ tokenId: t.id, type: t.type, address: a })))
              .flat(),
            (c) => getSortableIdentifier(c.tokenId, c.address, tokensMap)
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
            const res = await Promise.allSettled(
              checks.map(async (check) => {
                const token = tokensMap[check.tokenId]
                if (!token) {
                  throw new Error(`No token found for tokenId ${check.tokenId}`)
                }

                if (token.type === "evm-erc20" || token.type === "evm-uniswapv2") {
                  const balance = await client.readContract({
                    abi: erc20Abi,
                    address: token.contractAddress as EvmAddress,
                    functionName: "balanceOf",
                    args: [check.address as EvmAddress],
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
                      args: [check.address as EvmAddress],
                    })
                    return balance.toString()
                  }

                  const balance = await client.getBalance({
                    address: check.address as EvmAddress,
                  })
                  return balance.toString()
                }

                throw new Error("Unsupported token type")
              })
            )

            const newBalances = checks
              .map((check, i) => [check, res[i]] as const)
              .filter(([, res]) => res.status === "fulfilled" && res.value !== "0")
              .map<DiscoveredBalance>(([{ address, tokenId }, res]) => ({
                id: getSortableIdentifier(tokenId, address, tokensMap),
                tokenId,
                address,
                balance: (res as PromiseFulfilledResult<string>).value,
              }))

            const newState = await assetDiscoveryStore.mutate((prev) => {
              if (prev.currentScanId !== currentScanId) return prev

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
                0
              )
              const tokensProgress = Math.round((100 * totalScanned) / totalChecks)
              const networksProgress = Math.round(
                (100 * Object.keys(currentScanCursors).length) / Object.keys(tokensByNetwork).length
              )
              const currentScanProgressPercent = Math.min(tokensProgress, networksProgress)

              return {
                ...prev,
                currentScanCursors,
                currentScanProgressPercent,
                currentScanTokensCount: totalTokens,
              }
            })

            if (newState.currentScanId === currentScanId)
              if (newBalances.length) {
                await db.assetDiscovery.bulkPut(newBalances)

                // display alert if it has not been explicitely dismissed
                // happens if user navigated away from asset discovery screen before a new token is found
                const { showAssetDiscoveryAlert, dismissedAssetDiscoveryAlertScanId } =
                  await appStore.get()
                if (
                  !showAssetDiscoveryAlert &&
                  dismissedAssetDiscoveryAlertScanId !== currentScanId
                )
                  await appStore.set({ showAssetDiscoveryAlert: true })
              }
          }
        } catch (err) {
          log.error(`Could not scan network ${networkId}`, { err })
        }
      })

    await assetDiscoveryStore.mutate((prev) => {
      if (prev.currentScanId !== currentScanId) return prev
      return {
        ...prev,
        currentScanId: null,
        currentScanProgressPercent: 100,
        currentScanCursors: {},
        currentScanAccounts: [],
        lastScanTimestamp: Date.now(),
        lastScanAccounts: prev.currentScanAccounts,
        lastScanMode: prev.currentScanMode,
        lastScanTokensCount: prev.currentScanTokensCount,
        status: "idle",
      }
    })

    if ((await db.assetDiscovery.count()) === 0)
      await appStore.set({ showAssetDiscoveryAlert: false })
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

    await this.startScan({ addresses, mode: AssetDiscoveryMode.ACTIVE_NETWORKS })
    await appStore.set({ isAssetDiscoveryScanPending: false })
  }
}

export const assetDiscoveryScanner = new AssetDiscoveryScanner()
