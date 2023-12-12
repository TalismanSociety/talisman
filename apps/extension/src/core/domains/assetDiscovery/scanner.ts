import { db } from "@core/db"
import { log } from "@core/log"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import keyring from "@polkadot/ui-keyring"
import PromisePool from "@supercharge/promise-pool"
import { erc20Abi } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import chunk from "lodash/chunk"
import Browser from "webextension-polyfill"

import { enabledEvmNetworksStore, isEvmNetworkEnabled } from "../ethereum/store.enabledEvmNetworks"
import { EvmAddress } from "../ethereum/types"
import { enabledTokensStore, isTokenEnabled } from "../tokens/store.enabledTokens"
import { assetDiscoveryStore } from "./store"
import { AssetDiscoveryResult, RequestAssetDiscoveryStartScan } from "./types"

const MANUAL_SCAN_MAX_CONCURRENT_NETWORK = 4
const BALANCES_FETCH_CHUNK_SIZE = 100

/**
 * To avoid creating empty balance rows for each token/account couple, we will use cursors :
 * for each chain keep track of the latest token/account that was scanned, and process them alphabetically
 */
class AssetDiscoveryScanner {
  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    setTimeout(async () => {
      const currentScanId = await assetDiscoveryStore.get("currentScanId")
      if (currentScanId) this.resumeScan()
    }, 10_000)
  }

  public async startScan({ full }: RequestAssetDiscoveryStartScan): Promise<boolean> {
    if (await assetDiscoveryStore.get("currentScanId")) throw new Error("Scan already in progress")

    // 0. Clear scan table
    await db.assetDiscovery.clear()

    // 1. Set scan status in state
    await assetDiscoveryStore.set({
      currentScanId: crypto.randomUUID(),
      currentScanFull: full,
      currentScanType: "manual",
      status: "scanning",
    })

    // 2. Provision scan table with empty rows for each disabled token/account combination
    const [allTokens, evmNetworks, enabledTokens, enabledEvmNetworks] = await Promise.all([
      chaindataProvider.tokensArray(),
      chaindataProvider.evmNetworks(),
      enabledTokensStore.get(),
      enabledEvmNetworksStore.get(),
      awaitKeyringLoaded(), // ensures we can pickup all accounts
    ])

    const tokenIds = allTokens
      .filter((token) => {
        if (token.type !== "evm-erc20") return false
        const evmNetwork = evmNetworks[token.evmNetwork?.id ?? ""]
        if (!evmNetwork) return false
        if (full)
          return (
            !isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks) ||
            !isTokenEnabled(token, enabledTokens)
          )
        return (
          isEvmNetworkEnabled(evmNetwork, enabledEvmNetworks) &&
          !isTokenEnabled(token, enabledTokens)
        )
      })
      .map(({ id }) => id)

    const addresses = keyring
      .getAccounts()
      .filter((acc) => isEthereumAddress(acc.address))
      .map((acc) => acc.address)
    const results = tokenIds.flatMap((tokenId) =>
      addresses.map<AssetDiscoveryResult>((address) => ({
        id: `${tokenId}::${address}`,
        tokenId,
        address,
        balance: null,
        status: "pending",
      }))
    )

    await db.assetDiscovery.bulkAdd(results)

    // 3. TODO Start scan
    this.resumeScan()

    return true
  }

  public async stopScan(): Promise<boolean> {
    const currentScanId = await assetDiscoveryStore.get("currentScanId")
    if (currentScanId)
      await assetDiscoveryStore.set({
        currentScanId: null,
        status: "cancelled",
      })

    return true
  }

  private async resumeScan(): Promise<void> {
    const currentScanId = await assetDiscoveryStore.get("currentScanId")
    if (!currentScanId) return

    const results = await db.assetDiscovery.filter((r) => r.status === "pending").toArray()
    const tokens = await chaindataProvider.tokens()

    // group tokens by network
    const tokensByNetwork: Record<EvmNetworkId | ChainId, AssetDiscoveryResult[]> = {}
    results.forEach((result) => {
      const token = tokens[result.tokenId]
      if (!token) return
      const networkId = token.evmNetwork?.id ?? token.chain?.id
      if (!networkId) {
        log.warn(`No networkId found for token ${result.tokenId}`)
        // TODO mark result as errored
        return
      }
      if (!tokensByNetwork[networkId]) tokensByNetwork[networkId] = []
      tokensByNetwork[networkId].push(result)
    })

    // process 4 networks at a time
    await PromisePool.withConcurrency(MANUAL_SCAN_MAX_CONCURRENT_NETWORK)
      .for(Object.keys(tokensByNetwork))
      .process(async (networkId) => {
        if (currentScanId !== (await assetDiscoveryStore.get("currentScanId"))) return

        const networkResults = tokensByNetwork[networkId]
        if (!networkResults) {
          //TODO error the rows
          return
        }

        const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
        if (!client) {
          //TODO error the rows
          return
        }

        //Split into chunks of 50
        const chunks = chunk(networkResults, BALANCES_FETCH_CHUNK_SIZE)

        for (const chunk of chunks) {
          // //console.log("fetching %d on %s", chunk.length, networkId)
          const res = await Promise.allSettled(
            chunk.map(async (result) => {
              const token = tokens[result.tokenId]
              if (!token) {
                throw new Error(`No token found for tokenId ${result.tokenId}`)
              }

              if (token.type === "evm-erc20") {
                const balance = await client.readContract({
                  abi: erc20Abi,
                  address: token.contractAddress as EvmAddress,
                  functionName: "balanceOf",
                  args: [result.address as EvmAddress],
                })
                return balance.toString()
              }

              throw new Error("Unsupported token type")
            })
          )

          if (currentScanId !== (await assetDiscoveryStore.get("currentScanId"))) return

          const updates = chunk
            .map((chunk, i) => [chunk, res[i]] as const)
            .map<AssetDiscoveryResult>(([chunk, res]) => ({
              ...chunk,
              balance: res.status === "fulfilled" ? res.value : null,
              status: res.status === "fulfilled" ? "success" : "error",
            }))

          await db.assetDiscovery.bulkPut(updates)
        }
      })

    await assetDiscoveryStore.set({
      currentScanId: null,
      lastScanTimestamp: Date.now(),
      lastScanAccounts: [...new Set(results.map((r) => r.address))],
      lastScanFull: await assetDiscoveryStore.get("currentScanFull"),
      status: "completed",
    })
  }
}

export const assetDiscoveryScanner = new AssetDiscoveryScanner()

// safety measure
if (Browser.extension.getBackgroundPage() !== window)
  throw new Error("@core/domains/assetDiscovery/store cannot be imported from front end")
