import { arrayChunk, assert } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import PromisePool from "@supercharge/promise-pool"
import { ChainConnectionError } from "@talismn/chain-connector"
import { githubTokenLogoUrl, TokenId } from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decodeMetadata,
  encodeMetadata,
  getDynamicBuilder,
  getLookupFn,
} from "@talismn/scale"
import { Deferred } from "@talismn/util"
import camelCase from "lodash/camelCase"
import isEqual from "lodash/isEqual"
import {
  BehaviorSubject,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  from,
  interval,
  map,
  Observable,
  share,
  switchMap,
  takeUntil,
  withLatestFrom,
} from "rxjs"

import {
  BalancesAllTransferMethods,
  DefaultBalanceModule,
  NewBalanceModule,
} from "../../BalanceModule"
import log from "../../log"
import { AddressesByToken, Balances, getBalanceId, SubscriptionCallback } from "../../types"
import { detectTransferMethod, RpcStateQueryHelper } from "../util"
import { subscribeBase } from "./subscribeBase"
import { subscribeCrowdloans } from "./subscribeCrowdloans"
import { subscribeNompoolStaking } from "./subscribeNompoolStaking"
import { subscribeSubtensorStaking } from "./subscribeSubtensorStaking"
import {
  CustomSubNativeToken,
  ModuleType,
  moduleType,
  SubNativeBalance,
  SubNativeChainMeta,
  SubNativeModuleConfig,
  SubNativeToken,
  subNativeTokenId,
  SubNativeTransferParams,
} from "./types"
import { mergeBalances } from "./util/mergeBalances"
import { QueryCache } from "./util/QueryCache"
import { sortChains } from "./util/sortChains"
import { SubNativeBalanceError } from "./util/SubNativeBalanceError"

export { filterBaseLocks, getLockTitle } from "./util/balanceLockTypes"
export type { BalanceLockType } from "./util/balanceLockTypes"

export type {
  CustomSubNativeToken,
  ModuleType,
  SubNativeBalance,
  SubNativeChainMeta,
  SubNativeModuleConfig,
  SubNativeToken,
  SubNativeTransferParams,
} from "./types"
export { subNativeTokenId } from "./types"

const DEFAULT_SYMBOL = "Unit"
const DEFAULT_DECIMALS = 0

const POLLING_WINDOW_SIZE = 20
const MAX_SUBSCRIPTION_SIZE = 40

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

      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))
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
      const hasSubtensorPallet = getConstantValue("SubtensorModule", "KeySwapCost") !== undefined

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
        { pallet: "SubtensorModule", items: ["TotalColdkeyStake"] },
      ])

      const miniMetadata = encodeMetadata(tag === "v15" ? { tag, metadata } : { tag, metadata })

      const hasFreezesItem = Boolean(
        metadata.pallets
          .find(({ name }) => name === "Balances")
          ?.storage?.items.find(({ name }) => name === "Freezes"),
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
        hasSubtensorPallet,
        miniMetadata,
        metadataVersion,
      }
      if (!useLegacyTransferableCalculation) delete chainMeta.useLegacyTransferableCalculation
      if (!hasSubtensorPallet) delete chainMeta.hasSubtensorPallet

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
          (initialBalances as SubNativeBalance[])?.map((b) => [getBalanceId(b), b]) ?? [],
        ),
      )
      // tokens which have a known positive balance
      const positiveBalanceTokens = subNativeBalances.pipe(
        map((balances) => Array.from(new Set(Object.values(balances).map((b) => b.tokenId)))),
        share(),
      )

      // tokens that will be subscribed to, simply a slice of the positive balance tokens of size MAX_SUBSCRIPTION_SIZE
      const subscriptionTokens = positiveBalanceTokens.pipe(
        map((tokens) => tokens.sort(sortChains).slice(0, MAX_SUBSCRIPTION_SIZE)),
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
            }, {}),
          ),
          distinctUntilChanged(isEqual),
          switchMap((newAddressesByToken) => {
            return from(queryCache.getQueries(newAddressesByToken)).pipe(
              switchMap((baseQueries) => {
                return new Observable((subscriber) => {
                  if (!chainConnectors.substrate) return

                  const unsubSubtensorStaking = subscribeSubtensorStaking(
                    chaindataProvider,
                    chainConnectors.substrate,
                    newAddressesByToken,
                    handleUpdateForSource("subtensor-staking"),
                  )
                  const unsubNompoolStaking = subscribeNompoolStaking(
                    chaindataProvider,
                    chainConnectors.substrate,
                    newAddressesByToken,
                    handleUpdateForSource("nompools-staking"),
                  )
                  const unsubCrowdloans = subscribeCrowdloans(
                    chaindataProvider,
                    chainConnectors.substrate,
                    newAddressesByToken,
                    handleUpdateForSource("crowdloan"),
                  )
                  const unsubBase = subscribeBase(
                    baseQueries,
                    chainConnectors.substrate,
                    handleUpdateForSource("base"),
                  )
                  subscriber.add(async () => (await unsubSubtensorStaking)())
                  subscriber.add(async () => (await unsubNompoolStaking)())
                  subscriber.add(async () => (await unsubCrowdloans)())
                  subscriber.add(async () => (await unsubBase)())
                })
              }),
            )
          }),
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
                  (error as ChainConnectionError).message,
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
            await poll({ [nonCurrentTokenId]: addressesByToken[nonCurrentTokenId] }),
        )

      // now poll every 30s on chains which are not subscriptionTokens
      // we chunk this observable into batches of positive token ids, to prevent eating all the websocket connections
      const pollingSub = interval(30_000) // emit values every 30 seconds
        .pipe(
          takeUntil(callerUnsubscribed),
          withLatestFrom(subscriptionTokens), // Combine latest value from subscriptionTokens with each interval tick
          map(([, subscribedTokenIds]) =>
            // Filter out tokens that are not subscribed
            Object.keys(addressesByToken).filter(
              (tokenId) => !subscribedTokenIds.includes(tokenId),
            ),
          ),
          exhaustMap((tokenIds) =>
            from(arrayChunk(tokenIds, POLLING_WINDOW_SIZE)).pipe(
              concatMap(async (tokenChunk) => {
                // tokenChunk is a chunk of tokenIds with size POLLING_WINDOW_SIZE
                const pollingTokenAddresses = Object.fromEntries(
                  tokenChunk.map((tokenId) => [tokenId, addressesByToken[tokenId]]),
                )
                await poll(pollingTokenAddresses)
                return true
              }),
            ),
          ),
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
              { cause },
            ),
          )
        }
      }

      const pallet = "balances"
      const args = sendAll ? { dest: to, keepAlive: false } : { dest: to, value: amount }

      const unsigned = defineMethod(
        {
          method: {
            pallet: camelCase(pallet),
            name: camelCase(method),
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
        { metadataRpc, registry, userExtensions },
      )

      return { type: "substrate", callData: unsigned.method }
    },
  }
}
