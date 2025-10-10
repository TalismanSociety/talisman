import {
  DotNetwork,
  EthNetwork,
  EvmNativeToken,
  getChaindataDbV3,
  LegacyChain,
  LegacyCustomChain,
  LegacyCustomEvmNetwork,
  LegacyEvmNetwork,
  subForeignAssetTokenId,
  SubNativeToken,
  subNativeTokenId,
} from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { assign, fromPairs, keyBy, toPairs } from "lodash-es"
import { filter, firstValueFrom } from "rxjs"

import { db as walletDb } from "../../../db"
import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { appStore } from "../../app/store.app"
import { assetDiscoveryStore } from "../../assetDiscovery/store"
import { activeNetworksStore } from "../../balances/store.activeNetworks"
import { activeTokensStore } from "../../balances/store.activeTokens"
import { activeChainsStore } from "../../chains/store.activeChains"
import { activeEvmNetworksStore } from "../../ethereum/store.activeEvmNetworks"
import { customChaindataStore } from "../store.customChaindata"

const MIGRATION_LABEL = "Updating Balances System"

export const migrateToChaindataV4: Migration = {
  forward: new MigrationFunction(() => executeMigration()),
  // no way back
}

const executeMigration = async () => {
  try {
    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0 } })

    const oldActiveEvmNetworks = await activeEvmNetworksStore.get()
    const oldActiveChains = await activeChainsStore.get()
    const oldActiveTokens = await activeTokensStore.get()

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.1 } })

    const {
      chains: oldChains,
      evmNetworks: oldEvmNetworks,
      tokens: oldTokens,
      db: oldChaindataDb,
    } = await getChaindataV3Entities()

    if (!oldChains.length && !oldEvmNetworks.length && !oldTokens.length)
      // this can happen if user closed the extension before acknowledging the migration popup
      throw new Error("Migration to chaindata v4 has already been applied, nothing to do")

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.4 } })

    const oldTokensMap = keyBy(oldTokens, (t) => t.id)
    const oldToNewTokenId = fromPairs(
      oldTokens.map((token) => [token.id, getChaindataV4TokenId(token.id, oldTokensMap)]),
    )

    // migrate active networks and tokens
    await activeNetworksStore.set(assign({}, oldActiveEvmNetworks, oldActiveChains))

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.5 } })

    await activeTokensStore.set(
      fromPairs(
        toPairs(oldActiveTokens)
          .map(([oldTokenId, isActive]) => {
            return [oldToNewTokenId[oldTokenId], isActive]
          })
          .filter(([tokenId]) => !!tokenId),
      ),
    )

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.6 } })

    // migrate custom networks and tokens
    await migrateCustomChains(oldChains, oldTokensMap)

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.7 } })

    await migrateCustomEvmNetworks(oldEvmNetworks, oldTokensMap)

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.8 } })

    // migrate tx history
    await migrateTransactions(oldToNewTokenId)

    await appStore.set({ currentMigration: { name: MIGRATION_LABEL, progress: 0.9 } })

    // clear asset discovery pending queue
    await assetDiscoveryStore.clear()

    try {
      indexedDB.deleteDatabase("TalismanBalances")
    } catch {
      // ignore, this is not critical
    }

    // delete old chaindata v3 db
    await oldChaindataDb?.delete()

    await appStore.set({
      currentMigration: {
        name: MIGRATION_LABEL,
        progress: 1,
        acknowledgeRequest:
          "Your Talisman has been upgraded to improve performance. Your portfolio may briefly show no balances as it is refreshed.",
      },
    })

    // wait for user to aknowledge that balances will be reloaded
    await firstValueFrom(
      appStore.observable.pipe(filter((appState) => !!appState.currentMigration?.acknowledged)),
    )
  } catch (error) {
    // actually none of the migrations should throw, unless there are storage (quota?) issues
    // consider non blocking, let the user access the app
    log.error("Error during chaindata v4 migration", error)
  } finally {
    await appStore.delete("currentMigration")
  }
}

const migrateTransactions = async (oldToNewTokenId: Record<string, string | null>) => {
  const txs = await walletDb.transactions.toArray()
  const newTxs = txs.map((tx) => {
    const newTx = structuredClone(tx)
    newTx.tokenId = (tx.tokenId && oldToNewTokenId[tx.tokenId]) ?? undefined

    const txInfo = newTx.txInfo
    // note: using isTxInfoSwap here would cause a circular dependency
    if (
      txInfo?.type === "swap-simpleswap" ||
      txInfo?.type === "swap-stealthex" ||
      txInfo?.type === "swap-lifi"
    ) {
      if (txInfo.fromTokenId && oldToNewTokenId[txInfo.fromTokenId])
        txInfo.fromTokenId = oldToNewTokenId[txInfo.fromTokenId]!
      if (txInfo.toTokenId && oldToNewTokenId[txInfo.toTokenId])
        txInfo.toTokenId = oldToNewTokenId[txInfo.toTokenId]!
    }

    return newTx
  })

  try {
    await walletDb.transactions.bulkPut(newTxs)
  } catch (error) {
    log.error("Error migrating transactions", { newTxs, error })
  }
}

const getChaindataV3Entities = async () => {
  try {
    const dbChaindataV3 = getChaindataDbV3()
    const [chains, evmNetworks, tokens] = await Promise.all([
      dbChaindataV3.chains.toArray(),
      dbChaindataV3.evmNetworks.toArray(),
      dbChaindataV3.tokens.toArray(),
    ])
    return {
      chains,
      evmNetworks,
      tokens,
      db: dbChaindataV3,
    }
  } catch (error) {
    log.error("Error fetching chaindata v3 entities", error)
    return { chains: [], evmNetworks: [], tokens: [] }
  }
}

const getChaindataV4TokenId = (
  oldTokenId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldTokens: Record<string, any>,
): string | null => {
  if (oldTokenId.includes("-evm-native")) return oldTokenId.replace("-evm-native", ":evm-native")

  if (oldTokenId.includes("-evm-erc20-")) return oldTokenId.replace("-evm-erc20-", ":evm-erc20:")

  if (oldTokenId.includes("-evm-uniswapv2-"))
    return oldTokenId.replace("-evm-erc20-", ":evm-erc20:")

  if (oldTokenId.includes("-substrate-native"))
    return oldTokenId.replace("-substrate-native", ":substrate-native")

  if (oldTokenId.includes("-substrate-tokens-"))
    return oldTokenId.replace("-substrate-tokens-", ":substrate-tokens:")

  if (oldTokenId.includes("-substrate-psp22-"))
    return oldTokenId.replace("-substrate-psp22-", ":substrate-psp22:")

  if (oldTokenId.includes("-substrate-assets-"))
    return oldTokenId
      .replace("-substrate-assets-", ":substrate-assets:")
      .split("-")
      .slice(0, -1) // remove symbol at the end
      .join(":")

  if (oldTokenId.includes("-substrate-equilibrium-")) return null // deprecated

  if (oldTokenId.includes("-substrate-foreignassets-")) {
    const oldToken = oldTokens[oldTokenId]
    if (oldToken && oldToken.chainId && oldToken.onChainId)
      return subForeignAssetTokenId(oldToken.chainId, oldToken.onChainId)

    log.debug("Unable to migrate foreign asset token ID", oldTokenId)
    return null
  }

  log.warn(`Unknown token ID format: ${oldTokenId}, cannot migrate to chaindata v4`)
  return null
}

const migrateCustomChains = async (
  oldChains: (LegacyChain | LegacyCustomChain)[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldTokensMap: Record<string, any>,
) => {
  // custom networks and tokens
  for (const customChain of oldChains.filter(
    (chain): chain is LegacyCustomChain => "isCustom" in chain && chain.isCustom,
  )) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldNativeToken: any = oldTokensMap[customChain.nativeToken?.id ?? ""]
    if (!oldNativeToken) {
      log.warn(`No native token found for custom chain ${customChain.id}, skipping migration`)
      continue
    }

    const nativeToken: SubNativeToken = {
      id: subNativeTokenId(customChain.id),
      networkId: customChain.id,
      type: "substrate-native",
      platform: "polkadot",
      symbol: oldNativeToken.symbol,
      decimals: oldNativeToken.decimals,
      coingeckoId: oldNativeToken.coingeckoId,
      name: oldNativeToken.symbol,
      isDefault: true,
      existentialDeposit: oldNativeToken.existentialDeposit ?? "0",
    }

    const customNetwork: DotNetwork = {
      id: customChain.id,
      platform: "polkadot",
      nativeTokenId: nativeToken.id,
      genesisHash: customChain.genesisHash as `0x${string}`,
      name: customChain.name as string,
      isTestnet: customChain.isTestnet,
      rpcs: customChain.rpcs?.map((r) => r.url) ?? [],
      blockExplorerUrls: [], // high risk of this not being set as it was introduced recently. its unlikely to have block explorer urls in custom chains anyway
      nativeCurrency: {
        symbol: nativeToken.symbol,
        name: nativeToken.name ?? nativeToken.symbol,
        decimals: nativeToken.decimals,
        coingeckoId: nativeToken.coingeckoId,
      },
      account: customChain.account as DotNetwork["account"],
      chainName: customChain.chainName!,
      specName: customChain.specName!,
      specVersion: Number(customChain.specVersion),
      prefix: customChain.prefix!,
      hasCheckMetadataHash: customChain.hasCheckMetadataHash ?? false,
      topology: { type: "standalone" },
      isDefault: true,
    }

    try {
      await customChaindataStore.upsertNetwork(customNetwork, nativeToken)
    } catch (err) {
      log.error(`Error migrating custom chain ${customChain.id}`, err)
      continue
    }
  }
}

const migrateCustomEvmNetworks = async (
  oldEvmNetworks: (LegacyEvmNetwork | LegacyCustomEvmNetwork)[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldTokensMap: Record<string, any>,
) => {
  for (const customEvmNetwork of oldEvmNetworks.filter(
    (chain): chain is LegacyCustomEvmNetwork => "isCustom" in chain && chain.isCustom,
  )) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const oldNativeToken: any = oldTokensMap[customEvmNetwork.nativeToken?.id ?? ""]
    if (!oldNativeToken) {
      log.warn(
        `No native token found for custom evmNetwork ${customEvmNetwork.id}, skipping migration`,
      )
      continue
    }

    const nativeToken: EvmNativeToken = {
      id: subNativeTokenId(customEvmNetwork.id),
      networkId: customEvmNetwork.id,
      type: "evm-native",
      platform: "ethereum",
      symbol: oldNativeToken.symbol,
      decimals: oldNativeToken.decimals,
      coingeckoId: oldNativeToken.coingeckoId,
      name: oldNativeToken.symbol,
      isDefault: true,
    }

    const customNetwork: EthNetwork = {
      id: customEvmNetwork.id,
      platform: "ethereum",
      nativeTokenId: nativeToken.id,
      name: customEvmNetwork.name as string,
      isTestnet: customEvmNetwork.isTestnet,
      rpcs: customEvmNetwork.rpcs?.map((r) => r.url) ?? [],
      blockExplorerUrls: [], // high risk of this not being set as it was introduced recently. its unlikely to have block explorer urls in custom chains anyway
      nativeCurrency: {
        symbol: nativeToken.symbol,
        name: nativeToken.name ?? nativeToken.symbol,
        decimals: nativeToken.decimals,
        coingeckoId: nativeToken.coingeckoId,
      },
      preserveGasEstimate: customEvmNetwork.preserveGasEstimate ?? false,
      isDefault: true,
    }

    try {
      await customChaindataStore.upsertNetwork(customNetwork, nativeToken)
    } catch (err) {
      log.error(`Error migrating custom chain ${customEvmNetwork.id}`, err)
      continue
    }
  }
}
