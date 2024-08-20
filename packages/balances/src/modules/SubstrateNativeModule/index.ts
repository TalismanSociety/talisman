import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { arrayChunk, assert, u8aToHex } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import PromisePool from "@supercharge/promise-pool"
import { ChainConnectionError, ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  ChainId,
  githubTokenLogoUrl,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"
import {
  Binary,
  compactMetadata,
  decodeMetadata,
  decodeScale,
  encodeMetadata,
  encodeStateKey,
  getDynamicBuilder,
} from "@talismn/scale"
import { decodeAnyAddress, Deferred, isEthereumAddress } from "@talismn/util"
import isEqual from "lodash/isEqual"
import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  from,
  interval,
  map,
  Observable,
  scan,
  share,
  switchAll,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import { u128 } from "scale-ts"

import {
  BalancesAllTransferMethods,
  DefaultBalanceModule,
  NewBalanceModule,
  NewTransferParamsType,
} from "../../BalanceModule"
import log from "../../log"
import { db as balancesDb } from "../../TalismanBalancesDatabase"
import {
  AddressesByToken,
  Balances,
  getBalanceId,
  getValueId,
  NewBalanceType,
  SubscriptionCallback,
} from "../../types"
import {
  buildStorageCoders,
  detectTransferMethod,
  findChainMeta,
  getUniqueChainIds,
  RpcStateQuery,
  RpcStateQueryHelper,
} from "../util"
import { QueryCache } from "./QueryCache"
import { asObservable, crowdloanFundContributionsChildKey, nompoolStashAccountId } from "./util"

export type { BalanceLockType } from "./util"
export { getLockTitle, filterBaseLocks } from "./util"

type ModuleType = "substrate-native"
const moduleType: ModuleType = "substrate-native"

export type SubNativeToken = Extract<Token, { type: ModuleType; isCustom?: true }>
export type CustomSubNativeToken = Extract<Token, { type: ModuleType; isCustom: true }>

const DEFAULT_SYMBOL = "Unit"
const DEFAULT_DECIMALS = 0

export const subNativeTokenId = (chainId: ChainId) =>
  `${chainId}-substrate-native`.toLowerCase().replace(/ /g, "-")

/**
 * Function to merge two 'sub sources' of the same balance together, or
 * two instances of the same balance with different values.
 * @param balance1 SubNativeBalance
 * @param balance2 SubNativeBalance
 * @param source source that this merge is for (will discard previous values from that source)
 * @returns SubNativeBalance
 */
const mergeBalances = (
  balance1: SubNativeBalance | undefined,
  balance2: SubNativeBalance,
  source: string
) => {
  if (balance1 === undefined) return balance2
  assert(
    getBalanceId(balance1) === getBalanceId(balance2),
    "Balances with different IDs should not be merged"
  )
  // locks and freezes should completely replace the previous rather than merging together
  const existingValues = Object.fromEntries(
    balance1.values
      .filter((v) => !v.source || v.source !== source)
      .map((value) => [getValueId(value), value])
  )
  const newValues = Object.fromEntries(balance2.values.map((value) => [getValueId(value), value]))
  const mergedValues = { ...existingValues, ...newValues }

  const merged = {
    ...balance1,
    status: balance2.status, // only the status field should actually be different apart from the values
    values: Object.values(mergedValues),
  }
  return merged
}

export type SubNativeChainMeta = {
  isTestnet: boolean
  useLegacyTransferableCalculation?: boolean
  symbol?: string
  decimals?: number
  existentialDeposit?: string
  nominationPoolsPalletId?: string
  crowdloanPalletId?: string
  miniMetadata?: string
  metadataVersion?: number
}

export type SubNativeModuleConfig = {
  disable?: boolean
} & BalancesConfigTokenParams

export type SubNativeBalance = NewBalanceType<ModuleType, "complex", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-native": SubNativeBalance
  }
}

export type SubNativeTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

const POLLING_WINDOW_SIZE = 20
const MAX_SUBSCRIPTION_SIZE = 40

const RELAY_TOKENS = ["polkadot-substrate-native", "kusama-substrate-native"]
const PUBLIC_GOODS_TOKENS = [
  "polkadot-asset-hub-substrate-native",
  "kusama-asset-hub-substrate-native",
]
const sortChains = (a: string, b: string) => {
  // polkadot and kusama should be checked first
  if (RELAY_TOKENS.includes(a)) return -1
  if (RELAY_TOKENS.includes(b)) return 1
  if (PUBLIC_GOODS_TOKENS.includes(a)) return -1
  if (PUBLIC_GOODS_TOKENS.includes(b)) return 1
  return 0
}

export const SubNativeModule: NewBalanceModule<
  ModuleType,
  SubNativeToken | CustomSubNativeToken,
  SubNativeChainMeta,
  SubNativeModuleConfig,
  SubNativeTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  const queryCache = new QueryCache(chaindataProvider)

  const getModuleTokens = async () => {
    return (await chaindataProvider.tokensByIdForType(moduleType)) as Record<string, SubNativeToken>
  }

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc, systemProperties) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false
      if (moduleConfig?.disable === true || metadataRpc === undefined) return { isTestnet }

      //
      // extract system_properties
      //

      const { tokenSymbol, tokenDecimals } = systemProperties ?? {}
      const symbol: string =
        (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) ?? DEFAULT_SYMBOL
      const decimals: number =
        (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) ?? DEFAULT_DECIMALS

      //
      // process metadata into SCALE encoders/decoders
      //

      const { metadataVersion, metadata, tag } = decodeMetadata(metadataRpc)
      if (!metadata) return { isTestnet, symbol, decimals }

      //
      // get runtime constants
      //

      const scaleBuilder = getDynamicBuilder(metadata)
      const getConstantValue = (palletName: string, constantName: string) => {
        const encodedValue = metadata.pallets
          .find(({ name }) => name === palletName)
          ?.constants.find(({ name }) => name === constantName)?.value
        if (!encodedValue) return

        return scaleBuilder.buildConstant(palletName, constantName)?.dec(encodedValue)
      }

      const existentialDeposit = getConstantValue("Balances", "ExistentialDeposit")?.toString()
      const nominationPoolsPalletId = getConstantValue("NominationPools", "PalletId")?.asText()
      const crowdloanPalletId = getConstantValue("Crowdloan", "PalletId")?.asText()

      //
      // compact metadata into miniMetadata
      //

      compactMetadata(metadata, [
        { pallet: "System", items: ["Account"] },
        { pallet: "Balances", items: ["Reserves", "Holds", "Locks", "Freezes"] },
        { pallet: "NominationPools", items: ["PoolMembers", "BondedPools", "Metadata"] },
        { pallet: "Staking", items: ["Ledger"] },
        { pallet: "Crowdloan", items: ["Funds"] },
        { pallet: "Paras", items: ["Parachains"] },
      ])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      const hasFreezesItem = Boolean(
        metadata.pallets
          .find(({ name }) => name === "Balances")
          ?.storage?.items.find(({ name }) => name === "Freezes")
      )
      const useLegacyTransferableCalculation = !hasFreezesItem

      const chainMeta: SubNativeChainMeta = {
        isTestnet,
        useLegacyTransferableCalculation,
        symbol,
        decimals,
        existentialDeposit,
        nominationPoolsPalletId,
        crowdloanPalletId,
        miniMetadata,
        metadataVersion,
      }
      if (!useLegacyTransferableCalculation) delete chainMeta.useLegacyTransferableCalculation

      return chainMeta
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      if (moduleConfig?.disable === true) return {}

      const { isTestnet, symbol, decimals, existentialDeposit } = chainMeta

      const id = subNativeTokenId(chainId)

      const nativeToken: SubNativeToken = {
        id,
        type: "substrate-native",
        isTestnet,
        isDefault: moduleConfig?.isDefault ?? true,
        symbol: symbol ?? DEFAULT_SYMBOL,
        decimals: decimals ?? DEFAULT_DECIMALS,
        logo: moduleConfig?.logo || githubTokenLogoUrl(id),
        existentialDeposit: existentialDeposit ?? "0",
        chain: { id: chainId },
      }

      if (moduleConfig?.symbol) nativeToken.symbol = moduleConfig?.symbol
      if (moduleConfig?.coingeckoId) nativeToken.coingeckoId = moduleConfig?.coingeckoId
      if (moduleConfig?.dcentName) nativeToken.dcentName = moduleConfig?.dcentName
      if (moduleConfig?.mirrorOf) nativeToken.mirrorOf = moduleConfig?.mirrorOf

      return { [nativeToken.id]: nativeToken }
    },

    async subscribeBalances({ addressesByToken, initialBalances }, callback) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      // full record of balances for this module
      const subNativeBalances = new BehaviorSubject<Record<string, SubNativeBalance>>(
        Object.fromEntries(
          (initialBalances as SubNativeBalance[])?.map((b) => [getBalanceId(b), b]) ?? []
        )
      )
      // tokens which have a known positive balance
      const positiveBalanceTokens = subNativeBalances.pipe(
        map((balances) => Array.from(new Set(Object.values(balances).map((b) => b.tokenId)))),
        share()
      )

      // tokens that will be subscribed to, simply a slice of the positive balance tokens of size MAX_SUBSCRIPTION_SIZE
      const subscriptionTokens = positiveBalanceTokens.pipe(
        map((tokens) => tokens.sort(sortChains).slice(0, MAX_SUBSCRIPTION_SIZE))
      )

      // an initialised balance is one where we have received a response for any type of 'subsource',
      // until then they are initialising. We only need to maintain one map of tokens to addresses for this
      const initialisingBalances = Object.entries(addressesByToken).reduce<
        Map<TokenId, Set<string>>
      >((acc, [tokenId, addresses]) => {
        acc.set(tokenId, new Set(addresses))
        return acc
      }, new Map())

      // after thirty seconds, we need to kill the initialising balances
      const initBalancesTimeout = setTimeout(() => {
        initialisingBalances.clear()
        // manually call the callback to ensure the caller gets the correct status
        callback(null, {
          status: "live",
          data: Object.values(subNativeBalances.getValue()),
        })
      }, 30_000)

      const _callbackSub = subNativeBalances.pipe(debounceTime(100)).subscribe({
        next: (balances) => {
          callback(null, {
            status: initialisingBalances.size > 0 ? "initialising" : "live",
            data: Object.values(balances),
          })
        },
        error: (error) => callback(error),
        complete: () => {
          initialisingBalances.clear()
          clearTimeout(initBalancesTimeout)
        },
      })

      const unsubDeferred = Deferred()
      // we return this to the caller so that they can let us know when they're no longer interested in this subscription
      const callerUnsubscribe = () => {
        subNativeBalances.complete()
        _callbackSub.unsubscribe()
        return unsubDeferred.reject(new Error(`Caller unsubscribed`))
      }
      // we queue up our work to clean up our subscription when this promise rejects
      const callerUnsubscribed = unsubDeferred.promise

      // The update handler is to allow us to merge balances with the same id, and manage initialising and positive balances state for each
      // balance type and network
      const handleUpdateForSource: (source: string) => SubscriptionCallback<SubNativeBalance[]> =
        (source: string) => (error, result) => {
          if (result) {
            const currentBalances = subNativeBalances.getValue()

            // first merge any balances with the same id within the result
            const accumulatedUpdates = result
              .filter((b) => b.values.length > 0)
              .reduce<Record<string, SubNativeBalance>>((acc, b) => {
                const bId = getBalanceId(b)
                acc[bId] = mergeBalances(acc[bId], b, source)
                return acc
              }, {})

            // then merge these with the current balances
            const mergedBalances: Record<string, SubNativeBalance> = {}
            Object.entries(accumulatedUpdates).forEach(([bId, b]) => {
              // merge the values from the new balance into the existing balance, if there is one
              mergedBalances[bId] = mergeBalances(currentBalances[bId], b, source)

              // update initialisingBalances to remove balances which have been updated
              const intialisingForToken = initialisingBalances.get(b.tokenId)
              if (intialisingForToken) {
                intialisingForToken.delete(b.address)
                if (intialisingForToken.size === 0) initialisingBalances.delete(b.tokenId)
                else initialisingBalances.set(b.tokenId, intialisingForToken)
              }
            })

            subNativeBalances.next({
              ...currentBalances,
              ...mergedBalances,
            })
          }
          if (error) {
            if (error instanceof SubNativeBalanceError) {
              // this type of error doesn't need to be handled by the caller
              initialisingBalances.delete(error.tokenId)
            } else return callback(error)
          }
        }

      // subscribe to addresses and tokens for which we have a known positive balance
      const positiveSub = subscriptionTokens
        .pipe(
          debounceTime(1000),
          takeUntil(callerUnsubscribed),
          map((tokenIds) =>
            tokenIds.reduce<AddressesByToken<SubNativeToken>>((acc, tokenId) => {
              acc[tokenId] = addressesByToken[tokenId]
              return acc
            }, {})
          ),
          distinctUntilChanged(isEqual),
          switchMap((newAddressesByToken) => {
            return from(queryCache.getQueries(newAddressesByToken)).pipe(
              switchMap((baseQueries) => {
                return new Observable((subscriber) => {
                  if (!chainConnectors.substrate) return

                  const unsubNompoolStaking = subscribeNompoolStaking(
                    chaindataProvider,
                    chainConnectors.substrate,
                    newAddressesByToken,
                    handleUpdateForSource("nompools-staking")
                  )
                  const unsubCrowdloans = subscribeCrowdloans(
                    chaindataProvider,
                    chainConnectors.substrate,
                    newAddressesByToken,
                    handleUpdateForSource("crowdloan")
                  )
                  const unsubBase = subscribeBase(
                    baseQueries,
                    chainConnectors.substrate,
                    handleUpdateForSource("base")
                  )
                  subscriber.add(async () => (await unsubNompoolStaking)())
                  subscriber.add(async () => (await unsubCrowdloans)())
                  subscriber.add(async () => (await unsubBase)())
                })
              })
            )
          })
        )
        .subscribe()

      // for chains where we don't have a known positive balance, poll rather than subscribe
      const poll = async (addressesByToken: AddressesByToken<SubNativeToken> = {}) => {
        const handleUpdate = handleUpdateForSource("base")
        try {
          const balances = await this.fetchBalances(addressesByToken)
          handleUpdate(null, Object.values(balances.toJSON()) as SubNativeBalance[])
        } catch (error) {
          if (error instanceof ChainConnectionError) {
            // coerce ChainConnection errors into SubNativeBalance errors
            const errorChainId = (error as ChainConnectionError).chainId
            Object.entries(await getModuleTokens())
              .filter(([, token]) => token.chain?.id === errorChainId)
              .forEach(([tokenId]) => {
                const wrappedError = new SubNativeBalanceError(
                  tokenId,
                  (error as ChainConnectionError).message
                )
                handleUpdate(wrappedError)
              })
          } else {
            log.error("unknown substrate native balance error", error)
            handleUpdate(error)
          }
        }
      }
      // do one poll to get things started
      const currentBalances = subNativeBalances.getValue()
      const currentTokens = new Set(Object.values(currentBalances).map((b) => b.tokenId))

      const nonCurrentTokens = Object.keys(addressesByToken)
        .filter((tokenId) => !currentTokens.has(tokenId))
        .sort(sortChains)

      // break nonCurrentTokens into chunks of POLLING_WINDOW_SIZE
      await PromisePool.withConcurrency(POLLING_WINDOW_SIZE)
        .for(nonCurrentTokens)
        .process(
          async (nonCurrentTokenId) =>
            await poll({ [nonCurrentTokenId]: addressesByToken[nonCurrentTokenId] })
        )

      // now poll every 30s on chains which are not subscriptionTokens
      // we chunk this observable into batches of positive token ids, to prevent eating all the websocket connections
      const pollingSub = interval(30_000) // emit values every 30 seconds
        .pipe(
          takeUntil(callerUnsubscribed),
          withLatestFrom(subscriptionTokens), // Combine latest value from subscriptionTokens with each interval tick
          map(([, subscribedTokenIds]) =>
            // Filter out tokens that are not subscribed
            Object.keys(addressesByToken).filter((tokenId) => !subscribedTokenIds.includes(tokenId))
          ),
          exhaustMap((tokenIds) =>
            from(arrayChunk(tokenIds, POLLING_WINDOW_SIZE)).pipe(
              concatMap(async (tokenChunk) => {
                // tokenChunk is a chunk of tokenIds with size POLLING_WINDOW_SIZE
                const pollingTokenAddresses = Object.fromEntries(
                  tokenChunk.map((tokenId) => [tokenId, addressesByToken[tokenId]])
                )
                await poll(pollingTokenAddresses)
                return true
              })
            )
          )
        )
        .subscribe()

      return () => {
        callerUnsubscribe()
        positiveSub.unsubscribe()
        pollingSub.unsubscribe()
      }
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")
      const queries = await queryCache.getQueries(addressesByToken)

      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()

      return new Balances(result ?? [])
    },

    async transferToken({
      tokenId,
      from,
      to,
      amount,

      registry,
      metadataRpc,
      blockHash,
      blockNumber,
      nonce,
      specVersion,
      transactionVersion,
      tip,
      transferMethod,
      userExtensions,
    }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-native")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const sendAll = transferMethod === "transfer_all"

      let method: BalancesAllTransferMethods = transferMethod
      if (transferMethod === "transfer_allow_death") {
        try {
          method = detectTransferMethod(metadataRpc)
        } catch (cause) {
          log.debug(
            new Error(
              `An error occured while detecting the presence of the deprecated Balances::transfer call on chain ${chainId}`,
              { cause }
            )
          )
        }
      }

      const pallet = "balances"
      const args = sendAll ? { dest: to, keepAlive: false } : { dest: to, value: amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet,
            name: method,
            args,
          },
          address: from,
          blockHash,
          blockNumber,
          eraPeriod: 64,
          genesisHash,
          metadataRpc,
          nonce,
          specVersion,
          tip: tip ? Number(tip) : 0,
          transactionVersion,
        },
        { metadataRpc, registry, userExtensions }
      )

      return { type: "substrate", callData: unsigned.method }
    },
  }
}

async function subscribeNompoolStaking(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()
  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )
  const nomPoolTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return false
      // ignore tokens on chains with no nompools pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        allChains[token.chain.id]
      )
      return typeof chainMeta?.nominationPoolsPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // staking can only be done by the native token on chains with the staking pallet
  const addressesByNomPoolToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't nom pool tokens
      .filter(([tokenId]) => nomPoolTokenIds.includes(tokenId))
  )

  const uniqueChainIds = getUniqueChainIds(addressesByNomPoolToken, tokens)
  const chains = Object.fromEntries(
    Object.entries(allChains).filter(([chainId]) => uniqueChainIds.includes(chainId))
  )
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      poolMembers: ["NominationPools", "PoolMembers"],
      bondedPools: ["NominationPools", "BondedPools"],
      ledger: ["Staking", "Ledger"],
      metadata: ["NominationPools", "Metadata"],
    },
  })

  const resultUnsubscribes: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByNomPoolToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    const [chainMeta] = findChainMeta<typeof SubNativeModule>(
      miniMetadatas,
      "substrate-native",
      chain
    )
    const { nominationPoolsPalletId } = chainMeta ?? {}

    type PoolMembers = {
      tokenId: string
      address: string
      poolId?: string
      points?: string
      unbondingEras: Array<{ era?: string; amount?: string }>
    }
    const subscribePoolMembers = (
      addresses: string[],
      callback: SubscriptionCallback<PoolMembers[]>
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.poolMembers
      const queries = addresses.flatMap((address): RpcStateQuery<PoolMembers> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} poolMembers query ${address}`,
          address
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            pool_id?: number
            points?: bigint
            last_recorded_reward_counter?: bigint
            /** Array of `[Era, Amount]` */
            unbonding_eras?: Array<[number | undefined, bigint | undefined] | undefined>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode poolMembers on chain ${chainId}`
          )

          const poolId: string | undefined = decoded?.pool_id?.toString?.()
          const points: string | undefined = decoded?.points?.toString?.()
          const unbondingEras: Array<{ era: string; amount: string }> = Array.from(
            decoded?.unbonding_eras ?? []
          ).flatMap((entry) => {
            if (entry === undefined) return []
            const [key, value] = Array.from(entry)

            const era = key?.toString?.()
            const amount = value?.toString?.()
            if (typeof era !== "string" || typeof amount !== "string") return []

            return { era, amount }
          })

          return { tokenId, address, poolId, points, unbondingEras }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolPoints = { poolId: string; points?: string }
    const subscribePoolPoints = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolPoints[]>
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.bondedPools
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolPoints> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} bondedPools query ${poolId}`,
          poolId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            commission?: unknown
            member_counter?: number
            points?: bigint
            roles?: unknown
            state?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode bondedPools on chain ${chainId}`
          )

          const points: string | undefined = decoded?.points?.toString?.()

          return { poolId, points }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolStake = { poolId: string; activeStake?: string }
    const subscribePoolStake = (poolIds: string[], callback: SubscriptionCallback<PoolStake[]>) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.ledger
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolStake> | [] => {
        if (!nominationPoolsPalletId) return []
        const stashAddress = nompoolStashAccountId(nominationPoolsPalletId, poolId)
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid address in ${chainId} ledger query ${stashAddress}`,
          stashAddress
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            active?: bigint
            legacy_claimed_rewards?: number[]
            stash?: string
            total?: bigint
            unlocking?: Array<{ value?: bigint; era?: number }>
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode ledger on chain ${chainId}`
          )

          const activeStake: string | undefined = decoded?.active?.toString?.()

          return { poolId, activeStake }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type PoolMetadata = { poolId: string; metadata?: string }
    const subscribePoolMetadata = (
      poolIds: string[],
      callback: SubscriptionCallback<PoolMetadata[]>
    ) => {
      if (poolIds.length === 0) callback(null, [])

      const scaleCoder = chainStorageCoders.get(chainId)?.metadata
      const queries = poolIds.flatMap((poolId): RpcStateQuery<PoolMetadata> | [] => {
        if (!nominationPoolsPalletId) return []
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid poolId in ${chainId} metadata query ${poolId}`,
          poolId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = Binary

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode metadata on chain ${chainId}`
          )

          const metadata = decoded?.asText?.()

          return { poolId, metadata }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    const poolMembersByAddress$ = asObservable(subscribePoolMembers)(addresses).pipe(
      scan((state, next) => {
        for (const poolMembers of next) {
          const { poolId, points, unbondingEras } = poolMembers
          if (typeof poolId === "string" && typeof points === "string")
            state.set(poolMembers.address, { poolId, points, unbondingEras })
          else state.set(poolMembers.address, null)
        }
        return state
      }, new Map<string, Required<Pick<PoolMembers, "poolId" | "points" | "unbondingEras">> | null>()),
      share()
    )

    const poolIdByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.poolId ?? null])))
    )
    const pointsByAddress$ = poolMembersByAddress$.pipe(
      map((pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.points ?? null])))
    )
    const unbondingErasByAddress$ = poolMembersByAddress$.pipe(
      map(
        (pm) => new Map(Array.from(pm).map(([address, pm]) => [address, pm?.unbondingEras ?? null]))
      )
    )
    const poolIds$ = poolIdByAddress$.pipe(
      map((byAddress) => [
        ...new Set(Array.from(byAddress.values()).flatMap((poolId) => poolId ?? [])),
      ])
    )

    const pointsByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolPoints)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolPoints of next) {
          const { poolId, points } = poolPoints
          if (typeof points === "string") state.set(poolId, points)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )
    const stakeByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolStake)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolStake of next) {
          const { poolId, activeStake } = poolStake
          if (typeof activeStake === "string") state.set(poolId, activeStake)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )
    const metadataByPool$ = poolIds$.pipe(
      map((poolIds) => asObservable(subscribePoolMetadata)(poolIds)),
      switchAll(),
      scan((state, next) => {
        for (const poolMetadata of next) {
          const { poolId, metadata } = poolMetadata
          if (typeof metadata === "string") state.set(poolId, metadata)
          else state.delete(poolId)
        }
        return state
      }, new Map<string, string>())
    )

    const subscription = combineLatest([
      poolIdByAddress$,
      pointsByAddress$,
      unbondingErasByAddress$,
      pointsByPool$,
      stakeByPool$,
      metadataByPool$,
    ]).subscribe({
      next: ([
        poolIdByAddress,
        pointsByAddress,
        unbondingErasByAddress,
        pointsByPool,
        stakeByPool,
        metadataByPool,
      ]) => {
        const balances = Array.from(poolIdByAddress)
          .map(([address, poolId]) => {
            const parsedPoolId = poolId === null ? undefined : parseInt(poolId)
            const points = pointsByAddress.get(address) ?? "0"
            const poolPoints = pointsByPool.get(poolId ?? "") ?? "0"
            const poolStake = stakeByPool.get(poolId ?? "") ?? "0"
            const poolMetadata = poolId ? metadataByPool.get(poolId) ?? `Pool ${poolId}` : undefined

            const amount =
              points === "0" || poolPoints === "0" || poolStake === "0"
                ? 0n
                : (BigInt(poolStake) * BigInt(points)) / BigInt(poolPoints)

            const unbondingAmount = (unbondingErasByAddress.get(address) ?? []).reduce(
              (total, { amount }) => total + BigInt(amount ?? "0"),
              0n
            )

            return {
              source: "substrate-native",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              values: [
                {
                  source: "nompools-staking",
                  type: "nompool",
                  label: "nompools-staking",
                  amount: amount.toString(),
                  meta: { type: "nompool", poolId: parsedPoolId, description: poolMetadata },
                },
                {
                  source: "nompools-staking",
                  type: "nompool",
                  label: "nompools-unbonding",
                  amount: unbondingAmount.toString(),
                  meta: {
                    poolId: parsedPoolId,
                    description: poolMetadata,
                    unbonding: true,
                  },
                },
              ],
            } as SubNativeBalance
          })
          .filter(Boolean) as SubNativeBalance[]

        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    resultUnsubscribes.push(() => subscription.unsubscribe())
  }
  return () => resultUnsubscribes.forEach((unsub) => unsub())
}

async function subscribeCrowdloans(
  chaindataProvider: ChaindataProvider,
  chainConnector: ChainConnector,
  addressesByToken: AddressesByToken<SubNativeToken | CustomSubNativeToken>,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const allChains = await chaindataProvider.chainsById()
  const tokens = await chaindataProvider.tokensById()

  const miniMetadatas = new Map(
    (await balancesDb.miniMetadatas.toArray()).map((miniMetadata) => [
      miniMetadata.id,
      miniMetadata,
    ])
  )
  const crowdloanTokenIds = Object.entries(tokens)
    .filter(([, token]) => {
      // ignore non-native tokens
      if (token.type !== "substrate-native") return
      // ignore tokens on chains with no crowdloans pallet
      const [chainMeta] = findChainMeta<typeof SubNativeModule>(
        miniMetadatas,
        "substrate-native",
        allChains[token.chain.id]
      )
      return typeof chainMeta?.crowdloanPalletId === "string"
    })
    .map(([tokenId]) => tokenId)

  // crowdloan contributions can only be done by the native token on chains with the crowdloan pallet
  const addressesByCrowdloanToken = Object.fromEntries(
    Object.entries(addressesByToken)
      // remove ethereum addresses
      .map(([tokenId, addresses]): [string, string[]] => [
        tokenId,
        addresses.filter((address) => !isEthereumAddress(address)),
      ])
      // remove tokens which aren't crowdloan tokens
      .filter(([tokenId]) => crowdloanTokenIds.includes(tokenId))
  )

  const uniqueChainIds = getUniqueChainIds(addressesByCrowdloanToken, tokens)
  const chains = Object.fromEntries(
    Object.entries(allChains).filter(([chainId]) => uniqueChainIds.includes(chainId))
  )
  const chainStorageCoders = buildStorageCoders({
    chainIds: uniqueChainIds,
    chains,
    miniMetadatas,
    moduleType: "substrate-native",
    coders: {
      parachains: ["Paras", "Parachains"],
      funds: ["Crowdloan", "Funds"],
    },
  })

  const tokenSubscriptions: Array<() => void> = []
  for (const [tokenId, addresses] of Object.entries(addressesByCrowdloanToken)) {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      continue
    }
    if (token.type !== "substrate-native") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      continue
    }
    const chainId = token.chain?.id
    if (!chainId) {
      log.warn(`Token ${tokenId} has no chain`)
      continue
    }
    const chain = chains[chainId]
    if (!chain) {
      log.warn(`Chain ${chainId} for token ${tokenId} not found`)
      continue
    }

    const subscribeParaIds = (callback: SubscriptionCallback<Array<number[]>>) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.parachains
      const queries = [0].flatMap((): RpcStateQuery<number[]> | [] => {
        const stateKey = encodeStateKey(scaleCoder)
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = number[]
          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode parachains on chain ${chainId}`
          )

          const paraIds = decoded ?? []

          return paraIds
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type ParaFundIndex = {
      paraId: number
      fundPeriod: string
      fundIndex?: number
    }
    const subscribeParaFundIndexes = (
      paraIds: number[],
      callback: SubscriptionCallback<ParaFundIndex[]>
    ) => {
      const scaleCoder = chainStorageCoders.get(chainId)?.funds
      const queries = paraIds.flatMap((paraId): RpcStateQuery<ParaFundIndex> | [] => {
        const stateKey = encodeStateKey(
          scaleCoder,
          `Invalid paraId in ${chainId} funds query ${paraId}`,
          paraId
        )
        if (!stateKey) return []

        const decodeResult = (change: string | null) => {
          /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
          type DecodedType = {
            cap?: bigint
            deposit?: bigint
            depositor?: string
            end?: number
            fund_index?: number
            trie_index?: number
            first_period?: number
            last_period?: number
            last_contribution?: unknown
            raised?: bigint
            verifier?: unknown
          }

          const decoded = decodeScale<DecodedType>(
            scaleCoder,
            change,
            `Failed to decode paras on chain ${chainId}`
          )

          const firstPeriod = decoded?.first_period?.toString?.() ?? ""
          const lastPeriod = decoded?.last_period?.toString?.() ?? ""
          const fundPeriod = `${firstPeriod}-${lastPeriod}`
          const fundIndex = decoded?.fund_index ?? decoded?.trie_index

          return { paraId, fundPeriod, fundIndex }
        }

        return { chainId, stateKey, decodeResult }
      })

      const subscription = new RpcStateQueryHelper(chainConnector, queries).subscribe(callback)
      return () => subscription.then((unsubscribe) => unsubscribe())
    }

    type FundContribution = {
      paraId: number
      fundIndex: number
      address: string
      amount: string
    }
    const subscribeFundContributions = (
      funds: Array<{ paraId: number; fundIndex: number }>,
      addresses: string[],
      callback: SubscriptionCallback<FundContribution[]>
    ) => {
      // TODO: Watch system_events in order to subscribe to changes, then redo the contributions query when changes are detected:
      // https://github.com/polkadot-js/api/blob/8fe02a14345b57e6abb8f7f2c2b624cf70c51b23/packages/api-derive/src/crowdloan/ownContributions.ts#L32-L47
      //
      // For now we just re-fetch all contributions on a timer and then only send them to the subscription callback when they have changed

      const queries = funds.map(({ paraId, fundIndex }) => ({
        paraId,
        fundIndex,
        addresses,
        childKey: crowdloanFundContributionsChildKey(fundIndex),
        storageKeys: addresses.map((address) => u8aToHex(decodeAnyAddress(address))),
      }))

      // track whether our caller is still subscribed
      let subscriptionActive = true
      let previousContributions: FundContribution[] | null = null

      const fetchContributions = async () => {
        try {
          const results = await Promise.all(
            queries.map(async ({ paraId, fundIndex, addresses, childKey, storageKeys }) => ({
              paraId,
              fundIndex,
              addresses,
              result: await chainConnector.send<Array<string | null> | undefined>(
                chainId,
                "childstate_getStorageEntries",
                [childKey, storageKeys]
              ),
            }))
          )

          const contributions = results.flatMap((queryResult) => {
            const { paraId, fundIndex, addresses, result } = queryResult

            return (Array.isArray(result) ? result : []).flatMap((encoded, index) => {
              const amount = (() => {
                try {
                  return typeof encoded === "string" ? u128.dec(encoded) ?? 0n : 0n
                } catch {
                  return 0n
                }
              })().toString()

              return {
                paraId,
                fundIndex,
                address: addresses[index],
                amount,
              }
            })
          })

          // ignore these results if our caller has tried to close this subscription
          if (!subscriptionActive) return

          // ignore these results if they're the same as what we previously fetched
          if (isEqual(previousContributions, contributions)) return

          previousContributions = contributions
          callback(null, contributions)
        } catch (error) {
          callback(error)
        }
      }

      // set up polling for contributions
      const crowdloanContributionsPollInterval = 60_000 // 60_000ms === 1 minute
      const pollContributions = async () => {
        if (!subscriptionActive) return

        try {
          await fetchContributions()
        } catch (error) {
          // log any errors, but don't cancel the poll for contributions when one fetch fails
          log.error(error)
        }

        if (!subscriptionActive) return
        setTimeout(pollContributions, crowdloanContributionsPollInterval)
      }

      // start polling
      pollContributions()

      return () => {
        // stop polling
        subscriptionActive = false
      }
    }

    const paraIds$ = asObservable(subscribeParaIds)().pipe(
      scan((_, next) => Array.from(new Set(next.flatMap((paraIds) => paraIds))), [] as number[]),
      share()
    )

    const fundIndexesByParaId$ = paraIds$.pipe(
      map((paraIds) => asObservable(subscribeParaFundIndexes)(paraIds)),
      switchAll(),
      scan((state, next) => {
        for (const fund of next) {
          const { paraId, fundIndex } = fund
          if (typeof fundIndex === "number") {
            state.set(paraId, (state.get(paraId) ?? new Set()).add(fundIndex))
          }
        }
        return state
      }, new Map<number, Set<number>>())
    )

    const contributionsByAddress$ = fundIndexesByParaId$.pipe(
      map((fundIndexesByParaId) =>
        Array.from(fundIndexesByParaId).flatMap(([paraId, fundIndexes]) =>
          Array.from(fundIndexes).map((fundIndex) => ({ paraId, fundIndex }))
        )
      ),
      map((funds) => asObservable(subscribeFundContributions)(funds, addresses)),
      switchAll(),
      scan((state, next) => {
        for (const contribution of next) {
          const { address } = contribution
          state.set(address, (state.get(address) ?? new Set()).add(contribution))
        }
        return state
      }, new Map<string, Set<FundContribution>>())
    )

    const subscription = contributionsByAddress$.subscribe({
      next: (contributionsByAddress) => {
        const balances: SubNativeBalance[] = Array.from(contributionsByAddress).map(
          ([address, contributions]) => {
            return {
              source: "substrate-native",
              status: "live",
              address,
              multiChainId: { subChainId: chainId },
              chainId,
              tokenId,
              values: Array.from(contributions).map(({ amount, paraId }) => ({
                type: "crowdloan",
                label: "crowdloan",
                source: "crowdloan",
                amount: amount,
                meta: { paraId },
              })),
            }
          }
        )
        if (balances.length > 0) callback(null, balances)
      },
      error: (error) => callback(error),
    })

    tokenSubscriptions.push(() => subscription.unsubscribe())
  }

  return () => tokenSubscriptions.forEach((unsub) => unsub())
}

class SubNativeBalanceError extends Error {
  #tokenId: string

  constructor(tokenId: string, message: string) {
    super(`${tokenId}: ${message}`)
    this.name = "SubNativeBalanceError"
    this.#tokenId = tokenId
  }

  get tokenId() {
    return this.#tokenId
  }
}

async function subscribeBase(
  queries: RpcStateQuery<SubNativeBalance>[],
  chainConnector: ChainConnector,
  callback: SubscriptionCallback<SubNativeBalance[]>
) {
  const unsubscribe = await new RpcStateQueryHelper(chainConnector, queries).subscribe(
    (error, result) => {
      if (error) callback(error)
      if (result && result.length > 0) callback(null, result)
    }
  )

  return unsubscribe
}
