import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert, hexToNumber, hexToU8a, u8aToString } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import {
  SubPsp22Token,
  subPsp22TokenId,
  SubPsp22TokenSchema,
  TokenList,
} from "@talismn/chaindata-provider"
import camelCase from "lodash/camelCase"
import isEqual from "lodash/isEqual"
import z from "zod/v4"

import {
  DefaultBalanceModule,
  DefaultChainMeta,
  DefaultModuleConfig,
  NewBalanceModule,
  NewTransferParamsType,
} from "../BalanceModule"
import log from "../log"
import { AddressesByToken, BalanceJson, Balances, NewBalanceType } from "../types"
import { TokenConfigBaseSchema } from "../types/tokens"
import psp22Abi from "./abis/psp22.json"
import { makeContractCaller } from "./util"

type ModuleType = "substrate-psp22"
const moduleType: ModuleType = "substrate-psp22"

export const SubPsp22TokenConfigSchema = z.strictObject({
  contractAddress: SubPsp22TokenSchema.shape.contractAddress,
  ...TokenConfigBaseSchema.shape,
})

export type SubPsp22TokenConfig = z.infer<typeof SubPsp22TokenConfigSchema>

export type SubPsp22ChainMeta = DefaultChainMeta

export type SubPsp22ModuleConfig = DefaultModuleConfig

export type SubPsp22Balance = NewBalanceType<ModuleType, "simple">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-psp22": SubPsp22Balance
  }
}

export type SubPsp22TransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  userExtensions?: ExtDef
}>

export const SubPsp22Module: NewBalanceModule<
  ModuleType,
  SubPsp22Token,
  SubPsp22ChainMeta,
  SubPsp22ModuleConfig,
  SubPsp22TokenConfig,
  SubPsp22TransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(_chainId) {
      // we dont need anything
      return { miniMetadata: null, extra: null }
    },

    async fetchSubstrateChainTokens(chainId, _chainMeta, moduleConfig, tokens) {
      if (!tokens?.length) return {}

      const registry = new TypeRegistry()
      const Psp22Abi = new Abi(psp22Abi)

      // TODO: Use `decodeOutput` from `./util/decodeOutput`
      const contractCall = makeContractCaller({ chainConnector, chainId, registry })

      const tokenList: Record<string, SubPsp22Token> = {}
      for (const tokenConfig of tokens ?? []) {
        try {
          let symbol = tokenConfig?.symbol ?? "Unit"
          let decimals = tokenConfig?.decimals ?? 0
          const contractAddress = tokenConfig?.contractAddress ?? undefined

          if (contractAddress === undefined) continue

          await (async () => {
            const [symbolResult, decimalsResult] = await Promise.all([
              contractCall(
                contractAddress,
                contractAddress,
                Psp22Abi.findMessage("PSP22Metadata::token_symbol").toU8a([]),
              ),
              contractCall(
                contractAddress,
                contractAddress,
                Psp22Abi.findMessage("PSP22Metadata::token_decimals").toU8a([]),
              ),
            ])

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const symbolData = (symbolResult.toJSON()?.result as any)?.ok?.data
            symbol =
              typeof symbolData === "string" && symbolData.startsWith("0x")
                ? u8aToString(
                    registry.createType(
                      "Option<Vec<u8>>",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (symbolResult.toJSON()?.result as any)?.ok?.data,
                    )?.value,
                  )?.replace(/\p{C}/gu, "")
                : symbol

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decimalsData = (decimalsResult.toJSON()?.result as any)?.ok?.data
            decimals =
              typeof decimalsData === "string" && decimalsData.startsWith("0x")
                ? hexToNumber(decimalsData)
                : decimals
          })()

          const id = subPsp22TokenId(chainId, contractAddress)
          const token: SubPsp22Token = {
            id,
            type: "substrate-psp22",
            platform: "polkadot",
            isDefault: tokenConfig.isDefault ?? true,
            symbol,
            decimals,
            name: tokenConfig?.name || symbol,
            logo: tokenConfig?.logo,
            contractAddress,
            networkId: chainId,
          }

          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokenList[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-psp22 token ${tokenConfig.contractAddress} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error,
          )
          continue
        }
      }

      return tokenList
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 12_000 // 12_000ms == 12 seconds
      const initDelay = 3_000 // 3000ms == 3 seconds
      const cache = new Map<string, BalanceJson>()

      const tokens = await chaindataProvider.getTokensMapById()

      const poll = async () => {
        if (!subscriptionActive) return

        try {
          assert(chainConnectors.substrate, "This module requires a substrate chain connector")

          const balances = await fetchBalances(chainConnectors.substrate, tokens, addressesByToken)

          // Don't call callback with balances which have not changed since the last poll.
          const updatedBalances = new Balances(
            [...balances].filter((b) => {
              if (isEqual(cache.get(b.id), b.toJSON())) return false

              cache.set(b.id, b.toJSON())
              return true
            }),
          )

          callback(null, updatedBalances)
        } catch (error) {
          callback(error)
        } finally {
          setTimeout(poll, subscriptionInterval)
        }
      }

      setTimeout(poll, initDelay)

      return () => {
        subscriptionActive = false
      }
    },

    async fetchBalances(addressesByToken) {
      assert(chainConnectors.substrate, "This module requires a substrate chain connector")

      const tokens = await chaindataProvider.getTokensMapById()

      return fetchBalances(chainConnectors.substrate, tokens, addressesByToken)
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
      userExtensions,
    }) {
      const token = await chaindataProvider.getTokenById(tokenId, "substrate-psp22")
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-psp22")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.networkId
      const chain = await chaindataProvider.networkById(chainId, "polkadot")
      assert(chain?.genesisHash, `Chain ${chainId} not found in store`)

      const { genesisHash } = chain

      const Psp22Abi = new Abi(psp22Abi)

      // TODO: Use `decodeOutput` from `./util/decodeOutput`
      const contractCall = makeContractCaller({ chainConnector, chainId, registry })

      const data = Psp22Abi.findMessage("PSP22::transfer").toU8a([
        // TO
        to,
        // VALUE
        amount,
        // DATA
        undefined,
      ])
      const hexData = registry.createType("Vec<u8>", data).toHex()

      const dryRunResult = await contractCall(from, token.contractAddress, data)

      const pallet = "contracts"
      const method = "call"
      const args = {
        dest: token.contractAddress,
        value: 0,
        gasLimit: dryRunResult.gasRequired.toHex(),
        storageDepositLimit: dryRunResult.storageDeposit.isCharge
          ? dryRunResult.storageDeposit.asCharge.toHex()
          : null,
        data: hexData,
      }

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

const fetchBalances = async (
  chainConnector: ChainConnector,
  tokens: TokenList,
  addressesByToken: AddressesByToken<SubPsp22Token>,
) => {
  const registry = new TypeRegistry()
  const Psp22Abi = new Abi(psp22Abi)

  const balanceRequests = Object.entries(addressesByToken)
    .flatMap(([tokenId, addresses]) => addresses.map((address) => [tokenId, address]))
    .flatMap(async ([tokenId, address]) => {
      const token = tokens[tokenId]
      if (!token) {
        log.debug(`Token ${tokenId} not found`)
        return []
      }

      if (token.type !== "substrate-psp22") {
        log.debug(`This module doesn't handle tokens of type ${token.type}`)
        return []
      }

      // TODO: Use `decodeOutput` from `./util/decodeOutput`
      const contractCall = makeContractCaller({
        chainConnector,
        chainId: token.networkId,
        registry,
      })

      if (token.contractAddress === undefined) {
        log.debug(`Token ${tokenId} of type substrate-psp22 doesn't have a contractAddress`)
        return []
      }

      const result = await contractCall(
        address,
        token.contractAddress,
        Psp22Abi.findMessage("PSP22::balance_of").toU8a([
          // ACCOUNT
          address,
        ]),
      )

      const balance = registry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .createType("Balance", hexToU8a((result.toJSON()?.result as any)?.ok?.data).slice(1))
        .toString()

      return {
        source: "substrate-psp22",

        status: "live",

        address,
        networkId: token.networkId,
        tokenId,

        value: balance,
      } as SubPsp22Balance
    })

  // wait for balance fetches to complete
  const balanceResults = await Promise.allSettled(balanceRequests)

  // filter out errors
  const balances = balanceResults
    .map((result) => {
      if (result.status === "rejected") {
        log.debug(result.reason)
        return false
      }
      return result.value
    })
    .filter((balance): balance is SubPsp22Balance => balance !== false)

  // return to caller
  return new Balances(balances)
}
