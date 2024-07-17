import { Abi } from "@polkadot/api-contract"
import { TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { assert, hexToNumber, hexToU8a, u8aToString } from "@polkadot/util"
import { defineMethod } from "@substrate/txwrapper-core"
import { ChainConnector } from "@talismn/chain-connector"
import {
  BalancesConfigTokenParams,
  ChainId,
  githubTokenLogoUrl,
  Token,
  TokenList,
} from "@talismn/chaindata-provider"
import isEqual from "lodash/isEqual"

import { DefaultBalanceModule, NewBalanceModule, NewTransferParamsType } from "../BalanceModule"
import log from "../log"
import { AddressesByToken, BalanceJson, Balances, NewBalanceType } from "../types"
import psp22Abi from "./abis/psp22.json"
import { makeContractCaller } from "./util/makeContractCaller"

type ModuleType = "substrate-psp22"
const moduleType: ModuleType = "substrate-psp22"

export type SubPsp22Token = Extract<Token, { type: ModuleType }>

const subPsp22TokenId = (chainId: ChainId, tokenSymbol: string) =>
  `${chainId}-substrate-psp22-${tokenSymbol}`.toLowerCase().replace(/ /g, "-")

export type SubPsp22ChainMeta = {
  isTestnet: boolean
}

export type SubPsp22ModuleConfig = {
  tokens?: Array<
    {
      symbol?: string
      decimals?: number
      ed?: string
      contractAddress?: string
    } & BalancesConfigTokenParams
  >
}

export type SubPsp22Balance = NewBalanceType<ModuleType, "simple", "substrate">

declare module "@talismn/balances/plugins" {
  export interface PluginBalanceTypes {
    "substrate-psp22": SubPsp22Balance
  }
}

export type SubPsp22TransferParams = NewTransferParamsType<{
  registry: TypeRegistry
  metadataRpc: `0x${string}`
  blockHash: string
  blockNumber: number
  nonce: number
  specVersion: number
  transactionVersion: number
  tip?: string
  transferMethod: "transfer" | "transferKeepAlive" | "transferAll"
  userExtensions?: ExtDef
}>

export const SubPsp22Module: NewBalanceModule<
  ModuleType,
  SubPsp22Token,
  SubPsp22ChainMeta,
  SubPsp22ModuleConfig,
  SubPsp22TransferParams
> = (hydrate) => {
  const { chainConnectors, chaindataProvider } = hydrate
  const chainConnector = chainConnectors.substrate
  assert(chainConnector, "This module requires a substrate chain connector")

  return {
    ...DefaultBalanceModule(moduleType),

    async fetchSubstrateChainMeta(chainId) {
      const isTestnet = (await chaindataProvider.chainById(chainId))?.isTestnet || false

      return { isTestnet }
    },

    async fetchSubstrateChainTokens(chainId, chainMeta, moduleConfig) {
      const { isTestnet } = chainMeta

      const registry = new TypeRegistry()
      const Psp22Abi = new Abi(psp22Abi)

      // TODO: Use `decodeOutput` from `./util/decodeOutput`
      const contractCall = makeContractCaller({ chainConnector, chainId, registry })

      const tokens: Record<string, SubPsp22Token> = {}
      for (const tokenConfig of moduleConfig?.tokens ?? []) {
        try {
          let symbol = tokenConfig?.symbol ?? "Unit"
          let decimals = tokenConfig?.decimals ?? 0
          const existentialDeposit = tokenConfig?.ed ?? "0"
          const contractAddress = tokenConfig?.contractAddress ?? undefined

          if (contractAddress === undefined) continue

          await (async () => {
            const [symbolResult, decimalsResult] = await Promise.all([
              contractCall(
                contractAddress,
                contractAddress,
                Psp22Abi.findMessage("PSP22Metadata::token_symbol").toU8a([])
              ),
              contractCall(
                contractAddress,
                contractAddress,
                Psp22Abi.findMessage("PSP22Metadata::token_decimals").toU8a([])
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
                      (symbolResult.toJSON()?.result as any)?.ok?.data
                    )?.value
                  )?.replace(/\p{C}/gu, "")
                : symbol

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const decimalsData = (decimalsResult.toJSON()?.result as any)?.ok?.data
            decimals =
              typeof decimalsData === "string" && decimalsData.startsWith("0x")
                ? hexToNumber(decimalsData)
                : decimals
          })()

          const id = subPsp22TokenId(chainId, symbol)
          const token: SubPsp22Token = {
            id,
            type: "substrate-psp22",
            isTestnet,
            isDefault: tokenConfig.isDefault ?? true,
            symbol,
            decimals,
            logo: tokenConfig?.logo || githubTokenLogoUrl(id),
            existentialDeposit,
            contractAddress,
            chain: { id: chainId },
          }

          if (tokenConfig?.symbol) token.symbol = tokenConfig?.symbol
          if (tokenConfig?.coingeckoId) token.coingeckoId = tokenConfig?.coingeckoId
          if (tokenConfig?.dcentName) token.dcentName = tokenConfig?.dcentName
          if (tokenConfig?.mirrorOf) token.mirrorOf = tokenConfig?.mirrorOf

          tokens[token.id] = token
        } catch (error) {
          log.error(
            `Failed to build substrate-psp22 token ${tokenConfig.contractAddress} (${tokenConfig.symbol}) on ${chainId}`,
            (error as Error)?.message ?? error
          )
          continue
        }
      }

      return tokens
    },

    // TODO: Don't create empty subscriptions
    async subscribeBalances({ addressesByToken }, callback) {
      let subscriptionActive = true
      const subscriptionInterval = 12_000 // 12_000ms == 12 seconds
      const initDelay = 3_000 // 3000ms == 3 seconds
      const cache = new Map<string, BalanceJson>()

      const tokens = await chaindataProvider.tokensById()

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
            })
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

      const tokens = await chaindataProvider.tokensById()

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
      const token = await chaindataProvider.tokenById(tokenId)
      assert(token, `Token ${tokenId} not found in store`)

      if (token.type !== "substrate-psp22")
        throw new Error(`This module doesn't handle tokens of type ${token.type}`)

      const chainId = token.chain.id
      const chain = await chaindataProvider.chainById(chainId)
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

      return { type: "substrate", tx: unsigned }
    },
  }
}

const fetchBalances = async (
  chainConnector: ChainConnector,
  tokens: TokenList,
  addressesByToken: AddressesByToken<SubPsp22Token>
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
        chainId: token.chain.id,
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
        ])
      )

      const balance = registry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .createType("Balance", hexToU8a((result.toJSON()?.result as any)?.ok?.data).slice(1))
        .toString()

      return {
        source: "substrate-psp22",

        status: "live",

        address,
        multiChainId: { subChainId: token.chain.id },
        chainId: token.chain.id,
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
