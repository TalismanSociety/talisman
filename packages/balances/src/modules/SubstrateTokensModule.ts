import { mergeUint8, toHex } from "@polkadot-api/utils"
import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert } from "@polkadot/util"
import { ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChaindataProvider,
  DotNetworkId,
  parseSubTokensTokenId,
  SubTokensToken,
  subTokensTokenId,
} from "@talismn/chaindata-provider"
import {
  compactMetadata,
  decAnyMetadata,
  decodeScale,
  encodeMetadata,
  encodeStateKey,
  getDynamicBuilder,
  getLookupFn,
  papiParse,
  unifyMetadata,
} from "@talismn/scale"
import { isAbortError } from "@talismn/util"
import { keys, toPairs } from "lodash"
import { Binary } from "polkadot-api"

import {
  ChainMeta,
  DefaultBalanceModule,
  NewBalanceModule,
  NewTransferParamsType,
} from "../BalanceModule"
import { getMiniMetadata } from "../getMiniMetadata"
import log from "../log"
import { AddressesByToken, AmountWithLabel, Balances, NewBalanceType } from "../types"
import { buildNetworkStorageCoders, RpcStateQuery, RpcStateQueryHelper } from "./util"

type ModuleType = "substrate-tokens"
const moduleType: ModuleType = "substrate-tokens"

const defaultPalletId = "Tokens"

export type SubTokensChainMeta = ChainMeta<{
  palletId?: string // TODO unlikely it will ever be used - remove this ?
}>

const UNSUPPORTED_CHAIN_META: SubTokensChainMeta = {
  miniMetadata: null,
  extra: {},
}

export type SubTokensModuleConfig = {
  palletId?: string // TODO unlikely it will ever be used - remove this ?
  tokens?: Array<
    {
      symbol?: string
      decimals?: number
      ed?: string
      onChainId?: string | number
    } & BalancesConfigTokenParams
  >
}

export type SubTokensBalance = NewBalanceType<ModuleType, "complex">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-tokens": SubTokensBalance
  }
}

export type SubTokensTransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

export const SubTokensModule: NewBalanceModule<
  ModuleType,
  SubTokensToken,
  SubTokensChainMeta,
  SubTokensModuleConfig,
  SubTokensTransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId, moduleConfig, metadataRpc) {
      if (metadataRpc === undefined) return UNSUPPORTED_CHAIN_META

      const metadata = decAnyMetadata(metadataRpc)
      const palletId = moduleConfig?.palletId ?? defaultPalletId

      compactMetadata(metadata, [{ pallet: palletId, items: ["Accounts"] }])

      const miniMetadata = encodeMetadata(metadata)

      return { miniMetadata, extra: { palletId } }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const tokens: Record<string, SubTokensToken> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          const symbol = tokenConfig?.symbol ?? "Unit"
          const decimals = tokenConfig?.decimals ?? 0
          const existentialDeposit = tokenConfig?.ed ?? "0"
          const onChainId = tokenConfig?.onChainId ?? undefined

          if (onChainId === undefined) continue

          const id = subTokensTokenId(chainId, onChainId)
          const token: SubTokensToken = {
            id,
            type: "substrate-tokens",
            platform: "polkadot",
            isDefault: tokenConfig.isDefault ?? true,
            symbol,
            decimals,
            name: tokenConfig?.name ?? symbol,
            logo: tokenConfig?.logo,
            existentialDeposit,
            onChainId,
            networkId: chainId,
          }

          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-tokens token ${tokenConfig.onChainId} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error,
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      const byNetwork = keys(addressesByToken).reduce(
        (acc, tokenId) => {
          const networkId = parseSubTokensTokenId(tokenId).networkId
          if (!acc[networkId]) acc[networkId] = {}
          acc[networkId][tokenId] = addressesByToken[tokenId]

          return acc
        },
        {} as Record<DotNetworkId, AddressesByToken<SubTokensToken>>,
      )

      const controller = new AbortController()

      const pUnsubs = Promise.all(
        toPairs(byNetwork).map(async ([networkId, addressesByToken]) => {
          try {
            const queries = await buildNetworkQueries(
              networkId,
              chainConnector,
              chaindataProvider,
              addressesByToken,
              controller.signal,
            )
            if (controller.signal.aborted) return () => {}

            const stateHelper = new RpcStateQueryHelper(chainConnector, queries)

            return await stateHelper.subscribe((error, result) => {
              //  console.log("SubstrateAssetsModule.callback", { error, result })
              if (error) return callback(error)
              const balances = result?.filter((b): b is SubTokensBalance => b !== null) ?? []
              if (balances.length > 0) callback(null, new Balances(balances))
            })
          } catch (err) {
            if (!isAbortError(err))
              log.error(`Failed to subscribe balances for network ${networkId}`, err)
            return () => {}
          }
        }),
      )

      return () => {
        pUnsubs.then((unsubs) => {
          unsubs.forEach((unsubscribe) => unsubscribe())
        })
        controller.abort()
      }
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const queries = await buildQueries(chainConnector, chaindataProvider, addressesByToken)
      const result = await new RpcStateQueryHelper(chainConnectors.substrate, queries).fetch()
      const balances = result?.filter((b): b is SubTokensBalance => b !== null) ?? []
      return new Balances(balances)
    },

    async transferToken({ tokenId, to, amount, transferMethod, metadataRpc }) {
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-tokens")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.networkId
      const chain = await chaindataProvider.chainById(chainId)
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const miniMetadata = await getMiniMetadata<typeof SubTokensModule>(
        chaindataProvider,
        chainConnector,
        chainId,
        moduleType,
      )
      const tokensPallet = miniMetadata?.extra?.palletId ?? defaultPalletId

      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const metadata = unifyMetadata(decAnyMetadata(metadataRpc))
      const scaleBuilder = getDynamicBuilder(getLookupFn(metadata))

      const tryBuildCallData = (
        pallet: string,
        method: string,
        args: unknown,
      ): [Binary, undefined] | [undefined, Error] => {
        try {
          const { location, codec } = scaleBuilder.buildCall(pallet, method)
          return [
            Binary.fromBytes(mergeUint8([new Uint8Array(location), codec.enc(args)])),
            undefined,
          ]
        } catch (cause) {
          return [undefined, new Error("Failed to build call", { cause })]
        }
      }

      const sendAll = transferMethod === "transfer_all"

      // different chains use different transfer types
      // we'll try each one in sequence until we get one that doesn't throw an error
      const attempts = [
        {
          pallet: "Currencies",
          method: "transfer",
          args: {
            dest: { type: "Id", value: to },
            currency_id: onChainId,
            amount: BigInt(amount),
          },
        },
        {
          pallet: "Currencies",
          method: "transfer",
          args: {
            dest: to,
            currency_id: onChainId,
            amount: BigInt(amount),
          },
        },
        {
          pallet: tokensPallet,
          method: transferMethod,
          args: sendAll
            ? {
                dest: { type: "Id", value: to },
                currency_id: onChainId,
                keepAlive: false,
              }
            : {
                dest: { type: "Id", value: to },
                currency_id: onChainId,
                amount: BigInt(amount),
              },
        },
        {
          pallet: tokensPallet,
          method: transferMethod,
          args: sendAll
            ? {
                dest: to,
                currency_id: onChainId,
                keepAlive: false,
              }
            : {
                dest: to,
                currency_id: onChainId,
                amount: BigInt(amount),
              },
        },
      ]

      const errors: Error[] = []
      let callData: Binary | undefined = undefined
      for (const attempt of attempts) {
        const [_callData, error] = tryBuildCallData(attempt.pallet, attempt.method, attempt.args)
        if (error) {
          errors.push(error)
          continue
        }
        callData = _callData
        break
      }

      if (callData === undefined) {
        errors.forEach((error) => log.error(error))
        throw new Error(`${token.symbol} transfers are not supported at this time.`)
      }

      return { type: "substrate", callData: toHex(callData.asBytes()) }
    },
  }
}

async function buildNetworkQueries(
  networkId: DotNetworkId,
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubTokensToken>,
  signal?: AbortSignal,
): Promise<Array<RpcStateQuery<SubTokensBalance | null>>> {
  const miniMetadata = await getMiniMetadata<typeof SubTokensModule>(
    chaindataProvider,
    chainConnector,
    networkId,
    moduleType,
    signal,
  )

  const chain = await chaindataProvider.chainById(networkId)
  const tokens = await chaindataProvider.tokensById()

  if (!chain) return []

  signal?.throwIfAborted()

  const palletId = miniMetadata.extra.palletId ?? defaultPalletId

  const networkStorageCoders = buildNetworkStorageCoders(networkId, miniMetadata, {
    storage: [palletId, "Accounts"],
  })

  return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) => {
    const token = tokens[tokenId]
    if (!token) {
      log.warn(`Token ${tokenId} not found`)
      return []
    }
    if (token.type !== "substrate-tokens") {
      log.debug(`This module doesn't handle tokens of type ${token.type}`)
      return []
    }

    return addresses.flatMap((address): RpcStateQuery<SubTokensBalance | null> | [] => {
      const scaleCoder = networkStorageCoders?.storage

      const onChainId = (() => {
        try {
          return papiParse(token.onChainId)
        } catch (error) {
          return token.onChainId
        }
      })()

      const stateKey = encodeStateKey(
        scaleCoder,
        `Invalid address / token onChainId in ${networkId} storage query ${address} / ${token.onChainId}`,
        address,
        onChainId,
      )
      if (!stateKey) return []

      const decodeResult = (change: string | null) => {
        /** NOTE: This type is only a hint for typescript, the chain can actually return whatever it wants to */
        type DecodedType = {
          free?: bigint
          reserved?: bigint
          frozen?: bigint
        }

        const decoded = decodeScale<DecodedType>(
          scaleCoder,
          change,
          `Failed to decode substrate-tokens balance on chain ${networkId}`,
        ) ?? { free: 0n, reserved: 0n, frozen: 0n }

        const free = (decoded?.free ?? 0n).toString()
        const reserved = (decoded?.reserved ?? 0n).toString()
        const frozen = (decoded?.frozen ?? 0n).toString()

        const balanceValues: Array<AmountWithLabel<string>> = [
          { type: "free", label: "free", amount: free.toString() },
          { type: "reserved", label: "reserved", amount: reserved.toString() },
          { type: "locked", label: "frozen", amount: frozen.toString() },
        ]

        return {
          source: "substrate-tokens",
          status: "live",
          address,
          networkId,
          tokenId: token.id,
          values: balanceValues,
        } as SubTokensBalance
      }

      return { chainId: networkId, stateKey, decodeResult }
    })
  })
}

async function buildQueries(
  chainConnector: ChainConnector,
  chaindataProvider: ChaindataProvider,
  addressesByToken: AddressesByToken<SubTokensToken>,
  signal?: AbortSignal,
): Promise<Array<RpcStateQuery<SubTokensBalance | null>>> {
  const byNetwork = keys(addressesByToken).reduce(
    (acc, tokenId) => {
      const networkId = parseSubTokensTokenId(tokenId).networkId
      if (!acc[networkId]) acc[networkId] = {}
      acc[networkId][tokenId] = addressesByToken[tokenId]
      return acc
    },
    {} as Record<DotNetworkId, AddressesByToken<SubTokensToken>>,
  )

  return (
    await Promise.all(
      toPairs(byNetwork).map(([networkId, addressesByToken]) => {
        return buildNetworkQueries(
          networkId,
          chainConnector,
          chaindataProvider,
          addressesByToken,
          signal,
        )
      }),
    )
  ).flat()
}
