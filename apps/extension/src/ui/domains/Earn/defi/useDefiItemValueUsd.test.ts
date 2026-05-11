import type { DefiPositionItem } from "@core/domains/defi/exports"
import {
  type Network,
  type NetworkId,
  solNativeTokenId,
  solSplTokenId,
  solToken2022TokenId,
} from "@talismn/chaindata-provider"
import type { TokenRatesList } from "@talismn/token-rates"
import { describe, expect, it } from "vitest"

import { calcDefiItemValueUsd, resolveDefiTokenId } from "./useDefiItemValueUsd"

const PYUSD_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"

const makeItem = (overrides: Partial<DefiPositionItem> = {}): DefiPositionItem => ({
  type: "deposit",
  contract_address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  symbol: "TKN",
  decimals: 18,
  name: "Test Token",
  logo: null,
  amount: "7500000000000000000000", // 7500 tokens with 18 decimals
  valueUsd: 3.5, // wrong API value
  valueUsdChange1d: 0,
  ...overrides,
})

const makeNetworksMap = (): Record<NetworkId, Network> =>
  ({
    "1": { id: "1", platform: "ethereum" } as Network,
    "solana-mainnet": { id: "solana-mainnet", platform: "solana" } as Network,
  }) as Record<NetworkId, Network>

const makeTokensMap = (): Record<string, unknown> => ({
  "1:evm-erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": { id: "test-token" },
  "1:evm-native": { id: "ethereum" },
})

const makeTokenRatesMap = (): TokenRatesList =>
  ({
    "1:evm-erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": {
      usd: { price: 0.042 },
      aud: { price: 0.065 },
    },
  }) as unknown as TokenRatesList

describe("resolveDefiTokenId", () => {
  it("resolves EVM ERC20 token ID", () => {
    const result = resolveDefiTokenId(
      "1",
      "0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd",
      makeNetworksMap(),
      makeTokensMap()
    )
    expect(result).toBe("1:evm-erc20:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd")
  })

  it("resolves EVM native token ID when no contract address", () => {
    const result = resolveDefiTokenId("1", null, makeNetworksMap(), makeTokensMap())
    expect(result).toBe("1:evm-native")
  })

  it("returns null for unknown network", () => {
    const result = resolveDefiTokenId("999", "0xabc", makeNetworksMap(), makeTokensMap())
    expect(result).toBeNull()
  })

  it("returns null when token not in tokensMap", () => {
    const result = resolveDefiTokenId("1", "0xunknown", makeNetworksMap(), makeTokensMap())
    expect(result).toBeNull()
  })

  it("resolves Solana Token-2022 token ID", () => {
    const token2022Id = solToken2022TokenId("solana-mainnet", PYUSD_MINT)
    const result = resolveDefiTokenId("solana-mainnet", PYUSD_MINT, makeNetworksMap(), {
      ...makeTokensMap(),
      [token2022Id]: { id: token2022Id },
    })

    expect(result).toBe(token2022Id)
  })

  it("resolves Solana SPL token ID", () => {
    const splId = solSplTokenId("solana-mainnet", PYUSD_MINT)
    const result = resolveDefiTokenId("solana-mainnet", PYUSD_MINT, makeNetworksMap(), {
      ...makeTokensMap(),
      [splId]: { id: splId },
    })

    expect(result).toBe(splId)
  })

  it("prefers Solana Token-2022 token ID when both Solana token types are present", () => {
    const token2022Id = solToken2022TokenId("solana-mainnet", PYUSD_MINT)
    const splId = solSplTokenId("solana-mainnet", PYUSD_MINT)
    const result = resolveDefiTokenId("solana-mainnet", PYUSD_MINT, makeNetworksMap(), {
      ...makeTokensMap(),
      [splId]: { id: splId },
      [token2022Id]: { id: token2022Id },
    })

    expect(result).toBe(token2022Id)
  })

  it("resolves Solana native token ID when no contract address", () => {
    const nativeId = solNativeTokenId("solana-mainnet")
    const result = resolveDefiTokenId("solana-mainnet", null, makeNetworksMap(), {
      ...makeTokensMap(),
      [nativeId]: { id: nativeId },
    })

    expect(result).toBe(nativeId)
  })

  it("returns null for unknown Solana mints", () => {
    const result = resolveDefiTokenId(
      "solana-mainnet",
      PYUSD_MINT,
      makeNetworksMap(),
      makeTokensMap()
    )

    expect(result).toBeNull()
  })
})

describe("calcDefiItemValueUsd", () => {
  it("calculates USD value from own token rates when available", () => {
    const item = makeItem()
    const result = calcDefiItemValueUsd(
      item,
      "1",
      makeNetworksMap(),
      makeTokensMap(),
      makeTokenRatesMap()
    )
    // 7500 tokens * 0.042 USD/token = 315
    expect(result).toBeCloseTo(7500 * 0.042, 0)
  })

  it("falls back to API valueUsd when token not found", () => {
    const item = makeItem({ contract_address: "0xunknown" })
    const result = calcDefiItemValueUsd(
      item,
      "1",
      makeNetworksMap(),
      makeTokensMap(),
      makeTokenRatesMap()
    )
    expect(result).toBe(3.5)
  })

  it("falls back to API valueUsd when no rate data", () => {
    const item = makeItem()
    const result = calcDefiItemValueUsd(
      item,
      "1",
      makeNetworksMap(),
      makeTokensMap(),
      {} as TokenRatesList
    )
    expect(result).toBe(3.5)
  })

  it("falls back to API valueUsd for unknown network", () => {
    const item = makeItem()
    const result = calcDefiItemValueUsd(
      item,
      "999",
      makeNetworksMap(),
      makeTokensMap(),
      makeTokenRatesMap()
    )
    expect(result).toBe(3.5)
  })

  it("falls back to API valueUsd on invalid amount", () => {
    const item = makeItem({ amount: "not-a-number" })
    const result = calcDefiItemValueUsd(
      item,
      "1",
      makeNetworksMap(),
      makeTokensMap(),
      makeTokenRatesMap()
    )
    expect(result).toBe(3.5)
  })

  it("handles native token (no contract address)", () => {
    const nativeRates = {
      "1:evm-native": {
        usd: { price: 2500 },
      },
    } as unknown as TokenRatesList

    const item = makeItem({
      contract_address: null,
      symbol: "ETH",
      decimals: 18,
      amount: "1000000000000000000", // 1 ETH
    })

    const result = calcDefiItemValueUsd(item, "1", makeNetworksMap(), makeTokensMap(), nativeRates)
    expect(result).toBeCloseTo(2500, 0)
  })
})
