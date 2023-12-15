import { db } from "@core/db"
import { log } from "@core/log"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import PromisePool from "@supercharge/promise-pool"
import { erc20Abi } from "@talismn/balances"
import { abiMulticall } from "@talismn/balances/src/modules/abis/multicall"
import { EvmNetworkId, Token } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { isEvmToken } from "@ui/util/isEvmToken"
import { groupBy, sortBy } from "lodash"
import chunk from "lodash/chunk"

import { activeEvmNetworksStore, isEvmNetworkActive } from "../ethereum/store.activeEvmNetworks"
import { EvmAddress } from "../ethereum/types"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import { assetDiscoveryStore } from "./store"
import { DiscoveredBalance, RequestAssetDiscoveryStartScan } from "./types"

const MANUAL_SCAN_MAX_CONCURRENT_NETWORK = 4
const BALANCES_FETCH_CHUNK_SIZE = 100

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

  public async startScan({ full }: RequestAssetDiscoveryStartScan): Promise<boolean> {
    if (await assetDiscoveryStore.get("currentScanId")) throw new Error("Scan already in progress")

    // 1. Clear scan table
    await db.assetDiscovery.clear()

    // 2. Set scan status in state
    await awaitKeyringLoaded()
    const currentScanAccounts = keyring
      .getAccounts()
      .filter((acc) => isEthereumAddress(acc.address))
      .map((acc) => acc.address)

    await assetDiscoveryStore.set({
      currentScanId: crypto.randomUUID(),
      currentScanFull: full,
      currentScanType: "manual",
      currentScanProgressPercent: 0,
      currentScanCursors: {},
      currentScanAccounts,
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
      currentScanFull: isFullScan,
      currentScanAccounts: addresses,
      currentScanCursors: cursors,
    } = await assetDiscoveryStore.get()

    const [allTokens, evmNetworks, activeTokens, activeEvmNetworks] = await Promise.all([
      chaindataProvider.tokensArray(),
      chaindataProvider.evmNetworks(),
      activeTokensStore.get(),
      activeEvmNetworksStore.get(),
    ])

    const tokensMap = Object.fromEntries(allTokens.map((token) => [token.id, token]))

    const tokensToScan = allTokens.filter(isEvmToken).filter((token) => {
      const evmNetwork = evmNetworks[token.evmNetwork?.id ?? ""]
      if (!evmNetwork) return false
      if (isFullScan)
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
              .map((t) => addresses.map((a) => ({ tokenId: t.id, address: a })))
              .flat(),
            (c) => `${c.tokenId}::${c.address}`
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

                if (token.type === "evm-erc20") {
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
                id: `${tokenId}::${address}`,
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

              const totalScanned = Object.values(currentScanCursors).reduce(
                (acc, cur) => acc + cur.scanned,
                0
              )
              const currentScanProgressPercent = Math.round((100 * totalScanned) / totalChecks)

              return {
                ...prev,
                currentScanCursors,
                currentScanProgressPercent,
                currentScanTokensCount: totalTokens,
              }
            })

            if (newState.currentScanId === currentScanId)
              if (newBalances.length) await db.assetDiscovery.bulkPut(newBalances)
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
        currentScanProgressPercent: 100, // force 100% to account for networks that could not be scanned
        currentScanCursors: {},
        lastScanTimestamp: Date.now(),
        lastScanAccounts: addresses,
        lastScanFull: prev.currentScanFull,
        status: "idle",
      }
    })
  }
}

export const assetDiscoveryScanner = new AssetDiscoveryScanner()
