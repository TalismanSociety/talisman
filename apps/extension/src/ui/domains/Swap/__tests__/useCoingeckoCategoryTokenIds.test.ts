import type { Token } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"
import { mapCoingeckoCategoryTokenIds } from "../swap-services/useCoingeckoCategoryTokenIds"

function makeEvmErc20Token({
  id,
  symbol,
  networkId,
  contractAddress,
  coingeckoId,
}: {
  id: string
  symbol: string
  networkId: string
  contractAddress: string
  coingeckoId?: string
}) {
  return {
    id,
    symbol,
    networkId,
    contractAddress,
    coingeckoId,
    decimals: 6,
    type: "evm-erc20",
    name: symbol,
  } as unknown as Token
}

describe("mapCoingeckoCategoryTokenIds", () => {
  it("maps tokenIds by coingeckoId and preserves category order", () => {
    const tokenIds = ["1:evm-erc20:usdc", "8453:evm-erc20:usdc", "bittensor:substrate-native:doge"]
    const tokensMap: Record<string, Token | undefined> = {
      "1:evm-erc20:usdc": makeEvmErc20Token({
        id: "1:evm-erc20:usdc",
        symbol: "USDC",
        networkId: "1",
        contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        coingeckoId: "usd-coin",
      }),
      "8453:evm-erc20:usdc": makeEvmErc20Token({
        id: "8453:evm-erc20:usdc",
        symbol: "USDC",
        networkId: "8453",
        contractAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        coingeckoId: "usd-coin",
      }),
      "bittensor:substrate-native:doge": {
        id: "bittensor:substrate-native:doge",
        symbol: "DOGE",
        networkId: "bittensor",
        coingeckoId: "dogecoin",
        decimals: 9,
        type: "substrate-native",
        name: "DOGE",
      } as unknown as Token,
    }

    const result = mapCoingeckoCategoryTokenIds({
      tokenIds,
      tokensMap,
      categoryCoins: [
        { id: "dogecoin", symbol: "doge" },
        { id: "usd-coin", symbol: "usdc" },
      ],
    })

    expect(result).toEqual([
      "bittensor:substrate-native:doge",
      "1:evm-erc20:usdc",
      "8453:evm-erc20:usdc",
    ])
  })

  it("does not fallback to symbol or address heuristics without coingeckoId match", () => {
    const result = mapCoingeckoCategoryTokenIds({
      tokenIds: ["1:evm-erc20:usdc"],
      tokensMap: {
        "1:evm-erc20:usdc": makeEvmErc20Token({
          id: "1:evm-erc20:usdc",
          symbol: "USDC",
          networkId: "1",
          contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        }),
      },
      categoryCoins: [{ id: "usd-coin", symbol: "usdc" }],
    })

    expect(result).toEqual([])
  })
})
