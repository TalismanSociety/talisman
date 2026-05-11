import type { Networks, TokenDto } from "@core/domains/earn/exports"
import {
  evmErc20TokenId,
  type Network,
  type NetworkId,
  solNativeTokenId,
  solSplTokenId,
  solToken2022TokenId,
} from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import { getYieldxyzTokenId } from "./yieldxyz"

const PYUSD_MINT = "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"

const makeToken = (overrides: Partial<TokenDto>): TokenDto =>
  ({
    symbol: "PYUSD",
    name: "PayPal USD",
    decimals: 6,
    network: "solana" as Networks,
    ...overrides,
  }) as TokenDto

const mapToTalismanNetworkId: Record<string, string> = {
  ethereum: "1",
  solana: "solana-mainnet",
}

const networksMap = {
  "1": { id: "1", platform: "ethereum", nativeCurrency: { symbol: "ETH" } },
  "solana-mainnet": {
    id: "solana-mainnet",
    platform: "solana",
    nativeCurrency: { symbol: "SOL" },
  },
} as unknown as Record<NetworkId, Network>

describe("getYieldxyzTokenId", () => {
  it("maps a Token-2022 Solana mint when present in the token map", () => {
    const token2022Id = solToken2022TokenId("solana-mainnet", PYUSD_MINT)

    const result = getYieldxyzTokenId(
      makeToken({ address: PYUSD_MINT }),
      mapToTalismanNetworkId,
      networksMap,
      { [token2022Id]: { id: token2022Id } }
    )

    expect(result).toBe(token2022Id)
  })

  it("maps an SPL Solana mint when present in the token map", () => {
    const splId = solSplTokenId("solana-mainnet", PYUSD_MINT)

    const result = getYieldxyzTokenId(
      makeToken({ address: PYUSD_MINT }),
      mapToTalismanNetworkId,
      networksMap,
      { [splId]: { id: splId } }
    )

    expect(result).toBe(splId)
  })

  it("returns null for unknown addressed Solana mints", () => {
    const result = getYieldxyzTokenId(
      makeToken({ address: PYUSD_MINT }),
      mapToTalismanNetworkId,
      networksMap,
      {}
    )

    expect(result).toBeNull()
  })

  it("maps native SOL when the token has no address", () => {
    const result = getYieldxyzTokenId(
      makeToken({ address: undefined, symbol: "SOL", name: "Solana", decimals: 9 }),
      mapToTalismanNetworkId,
      networksMap,
      {}
    )

    expect(result).toBe(solNativeTokenId("solana-mainnet"))
  })

  it("keeps EVM token mapping unchanged", () => {
    const address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

    const result = getYieldxyzTokenId(
      makeToken({
        address,
        network: "ethereum" as Networks,
        symbol: "TKN",
        name: "Token",
        decimals: 18,
      }),
      mapToTalismanNetworkId,
      networksMap,
      {}
    )

    expect(result).toBe(evmErc20TokenId("1", address))
  })

  it("returns null for unknown YieldXYZ networks", () => {
    const result = getYieldxyzTokenId(
      makeToken({ network: "unknown" as Networks }),
      mapToTalismanNetworkId,
      networksMap,
      {}
    )

    expect(result).toBeNull()
  })
})
