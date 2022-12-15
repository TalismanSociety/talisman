import { ChainId } from "@core/domains/chains/types"
import { CustomErc20Token, CustomErc20TokenCreate } from "@core/domains/tokens/types"
import { talismanAnalytics } from "@core/libs/Analytics"
import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import { Port, RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"

import { getErc20TokenId } from "../ethereum/helpers"

export default class TokensHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // token handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(tokens.subscribe)":
        return this.stores.tokens.hydrateStore()

      // --------------------------------------------------------------------
      // ERC20 token handlers -----------------------------------------------------
      // --------------------------------------------------------------------

      case "pri(tokens.erc20.custom)":
        return (await db.tokens.toArray()).filter(
          // note : need to check type too because isCustom is also set to true for native tokens of custom networks
          (token) => "isCustom" in token && token.isCustom && token.type === "erc20"
        ) as any

      case "pri(tokens.erc20.custom.byid)": {
        const token = await db.tokens.get((request as RequestIdOnly).id)
        if (!token || !("isCustom" in token)) return
        return token
      }

      case "pri(tokens.erc20.custom.add)": {
        const token = request as CustomErc20TokenCreate
        const networkId = token.chainId || token.evmNetworkId
        assert(networkId, "A chainId or an evmNetworkId is required")
        const chain = token.chainId ? await db.chains.get(token.chainId) : undefined
        const evmNetwork = token.evmNetworkId
          ? await db.evmNetworks.get(token.evmNetworkId)
          : undefined
        assert(typeof token.contractAddress === "string", "A contract address is required")
        assert(typeof token.symbol === "string", "A token symbol is required")
        assert(typeof token.decimals === "number", "A number of token decimals is required")

        const tokenId = getErc20TokenId(networkId, token.contractAddress)
        const existing = await db.tokens.get(tokenId)
        assert(!existing, "This token already exists")

        const { symbol, decimals, coingeckoId, contractAddress, image } = token

        const newToken: CustomErc20Token = {
          id: tokenId,
          type: "erc20",
          isTestnet: (chain || evmNetwork)?.isTestnet || false,
          symbol,
          decimals: Number(decimals), // some dapps (ie moonriver.moonscan.io) may send a string here, which breaks balances
          coingeckoId,
          contractAddress,
          chain: token.chainId ? { id: token.chainId } : undefined,
          evmNetwork: token.evmNetworkId ? { id: token.evmNetworkId } : undefined,
          isCustom: true,
          image,
        }

        const res = await db.tokens.put(newToken)

        talismanAnalytics.capture(`${existing ? "update" : "add"} custom ERC20 token`, {
          evmNetworkId: token.evmNetworkId,
          symbol: token.symbol,
          contractAddress,
        })

        return res
      }

      case "pri(tokens.erc20.custom.remove)":
        return await db.tokens.delete((request as RequestIdOnly).id)

      case "pri(tokens.erc20.custom.clear)": {
        const filter = request as { chainId?: ChainId; evmNetworkId?: string } | undefined
        const deleteFilterFn = (token: CustomErc20Token) =>
          filter === undefined
            ? // delete if no filter set
              true
            : filter.chainId === token.chain?.id
            ? // delete if chainId filter set and this token is on the chain
              true
            : filter.evmNetworkId === token.evmNetwork?.id
            ? // delete if evmNetworkId set and this token is on the evmNetwork
              true
            : // don't delete
              false

        const deleteTokens = (await db.tokens.toArray())
          .filter((token): token is CustomErc20Token => {
            if (token.type !== "erc20") return false
            if (!("isCustom" in token)) return false
            return true
          })
          .filter(deleteFilterFn)
          .map((token) => token.id)
        await db.tokens.bulkDelete(deleteTokens)
        return
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
