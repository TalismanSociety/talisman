import { catalogue } from "@common/analytics/catalogue"
import { properties } from "@common/analytics/properties"
import { describe, expect, it } from "vitest"

import { parseTrackedEvent } from "../parse"
import { redactSecrets } from "../redactSecrets"
import { TVL_ALLOWED_COINGECKO_IDS, TVL_STABLECOIN_COINGECKO_IDS } from "./allowList.gen"
import { type Holding, summariseTvl, type TvlInputs } from "./summarise"

const DAY_MS = 24 * 60 * 60_000
const T0 = Date.UTC(2026, 9, 2, 12)

const NATIVE_COINGECKO_IDS: Record<string, string> = {
  "1": "ethereum",
  "polkadot": "polkadot",
  "polkadot-asset-hub": "polkadot",
  "obscure-chain": "obscure-coin",
}

const inputs = (overrides: Partial<TvlInputs> = {}): TvlInputs => ({
  trigger: "daily",
  accounts: [],
  mnemonics: [],
  enabledNetworkIds: [],
  customNetworkCount: 0,
  nativeCoingeckoIdOf: (networkId) => NATIVE_COINGECKO_IDS[networkId] ?? null,
  holdings: [],
  allowedCoingeckoIds: new Set(["ethereum", "polkadot", "tether"]),
  stablecoinCoingeckoIds: new Set(["tether"]),
  currency: "usd",
  installedAt: T0 - 10 * DAY_MS,
  now: T0,
  quickUnlockEnabled: false,
  ...overrides,
})

const held = (
  tokenId: string,
  networkId: string,
  coingeckoId: string | null,
  usd: number,
  { owner = "owned", stakedUsd = 0 }: Partial<Pick<Holding, "owner" | "stakedUsd">> = {}
): Holding => ({ owner, tokenId, networkId, coingeckoId, usd, stakedUsd })

describe("summariseTvl", () => {
  it("counts an off-list token and network without naming them", () => {
    const result = summariseTvl(
      inputs({
        enabledNetworkIds: ["1", "obscure-chain"],
        holdings: [
          held("1-evm-native", "1", "ethereum", 50),
          held("obscure-chain-native-OBSC", "obscure-chain", "obscure-coin", 50),
        ],
      })
    )

    expect(result).toMatchObject({
      enabled_network_count: "2-5",
      enabled_network_ids: ["1"],
      held_network_ids: ["1"],
      held_token_usd_buckets: ["10-100|ethereum"],
      other_token_count: "1",
      other_network_count: "1",
    })
    expect(JSON.stringify(result)).not.toMatch(/obsc/i)
  })

  it("holds from $1, and counts a network under $1 as dust", () => {
    const result = summariseTvl(
      inputs({
        holdings: [
          held("1-evm-native", "1", "ethereum", 1),
          held("polkadot-native", "polkadot", "polkadot", 0.5),
          held("polkadot-asset-hub-native", "polkadot-asset-hub", "polkadot", 0),
        ],
      })
    )

    expect(result).toMatchObject({
      held_network_ids: ["1"],
      held_token_usd_buckets: ["<10|ethereum"],
      dust_network_count: "1",
      other_network_count: "0",
      other_token_count: "0",
    })
  })

  it("lists ids and buckets by id, whatever their value", () => {
    const result = summariseTvl(
      inputs({
        holdings: [
          held("1-evm-native", "1", "ethereum", 50),
          held("polkadot-native", "polkadot", "polkadot", 5_000),
        ],
      })
    )

    expect(result.held_network_ids).toEqual(["1", "polkadot"])
    expect(result.held_network_usd_buckets).toEqual(["10-100|1", "1k-10k|polkadot"])
    expect(result.held_token_usd_buckets).toEqual(["10-100|ethereum", "1k-10k|polkadot"])
  })

  it("reads every holding above $1M as one open range per asset, and keeps the total's range", () => {
    const result = summariseTvl(
      inputs({
        holdings: [
          held("1-evm-native", "1", "ethereum", 2_000_000),
          held("polkadot-native", "polkadot", "polkadot", 250_000_000),
        ],
      })
    )

    expect(result.held_network_usd_buckets).toEqual([">1M|1", ">1M|polkadot"])
    expect(result.held_token_usd_buckets).toEqual([">1M|ethereum", ">1M|polkadot"])
    expect(result.portfolio_usd_bucket).toBe(">100M")
  })

  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2-5"],
    [5, "2-5"],
    [6, "6-20"],
    [20, "6-20"],
    [21, "21+"],
  ])("reads %i accounts as the range %s", (count, range) => {
    const accounts = Array.from({ length: count }, () => ({
      type: "keypair" as const,
      platform: "ethereum",
      createdAt: T0,
    }))

    expect(summariseTvl(inputs({ accounts })).wallet_account_count).toBe(range)
  })

  it("sums a token across networks by its CoinGecko id", () => {
    const result = summariseTvl(
      inputs({
        holdings: [
          held("1-evm-erc20-usdt", "1", "tether", 6),
          held("polkadot-asset-hub-substrate-assets-1984", "polkadot-asset-hub", "tether", 6),
        ],
      })
    )

    expect(result.held_token_usd_buckets).toEqual(["10-100|tether"])
  })

  it("buckets the staked and stablecoin shares of the owned portfolio", () => {
    const result = summariseTvl(
      inputs({
        holdings: [
          held("polkadot-native", "polkadot", "polkadot", 40, { stakedUsd: 30 }),
          held("1-evm-erc20-usdt", "1", "tether", 60),
          held("1-evm-native", "1", "ethereum", 1_000, { owner: "watched", stakedUsd: 1_000 }),
        ],
      })
    )

    expect(result).toMatchObject({
      portfolio_usd_bucket: "100-1k",
      watched_usd_bucket: "1k-10k",
      staked_share: "25-50%",
      stablecoin_share: "50-75%",
      is_funded: true,
    })
  })

  it("never names a custom network, even one whose token is allow-listed", () => {
    const result = summariseTvl(
      inputs({
        enabledNetworkIds: ["1", "my-devnet"],
        customNetworkCount: 1,
        holdings: [held("my-devnet-evm-native", "my-devnet", "ethereum", 50)],
      })
    )

    expect(result).toMatchObject({
      enabled_network_ids: ["1"],
      held_network_ids: [],
      held_network_usd_buckets: [],
      other_network_count: "1",
      custom_network_count: "1",
    })
    expect(JSON.stringify(result)).not.toContain("my-devnet")
  })

  it("leaves contacts out of the account counts", () => {
    const result = summariseTvl(
      inputs({
        accounts: [
          { type: "contact", platform: "ethereum", createdAt: T0 },
          { type: "keypair", platform: "ethereum", createdAt: T0 },
          { type: "ledger-ethereum", platform: "ethereum", createdAt: T0 },
          { type: "watch-only", platform: "polkadot", createdAt: T0 },
        ],
      })
    )

    expect(result).toMatchObject({
      wallet_account_count: "2-5",
      local_count: "1",
      ledger_count: "1",
      watch_count: "1",
      ethereum_count: "2-5",
      polkadot_count: "1",
    })
  })

  it("dates the install from the wallet's accounts, never from a contact", () => {
    const result = summariseTvl(
      inputs({
        installedAt: T0,
        accounts: [{ type: "contact", platform: "ethereum", createdAt: T0 - 400 * DAY_MS }],
      })
    )

    expect(result.days_since_install).toBe("0")
  })

  it("reads days since install as unknown when the install time was never recorded", () => {
    expect(summariseTvl(inputs({ installedAt: null })).days_since_install).toBe("unknown")
  })

  it("dates an install older than analytics from its oldest account or recovery phrase", () => {
    const result = (oldest: Partial<TvlInputs>) =>
      summariseTvl(inputs({ installedAt: T0, ...oldest })).days_since_install

    expect(
      result({
        accounts: [{ type: "keypair", platform: "ethereum", createdAt: T0 - 400 * DAY_MS }],
      })
    ).toBe("365+")
    expect(result({ mnemonics: [{ confirmed: true, createdAt: T0 - 40 * DAY_MS }] })).toBe("30-89")
  })

  it("only allow-lists ids the catalogue accepts and that read as no secret", () => {
    for (const id of [...TVL_ALLOWED_COINGECKO_IDS, ...TVL_STABLECOIN_COINGECKO_IDS]) {
      expect(properties.held_token_usd_buckets.schema.safeParse([`<10|${id}`]).success, id).toBe(
        true
      )
      expect(redactSecrets(id)).toBe(id)
    }
  })

  it("produces a snapshot the catalogue accepts", () => {
    const result = summariseTvl(
      inputs({
        allowedCoingeckoIds: new Set(TVL_ALLOWED_COINGECKO_IDS),
        stablecoinCoingeckoIds: new Set(TVL_STABLECOIN_COINGECKO_IDS),
        accounts: [
          { type: "keypair", platform: "ethereum", createdAt: T0 },
          { type: "polkadot-vault", platform: "polkadot", createdAt: T0 },
          { type: "signet", platform: "polkadot", createdAt: T0 },
        ],
        mnemonics: [
          { confirmed: true, createdAt: T0 },
          { confirmed: false, createdAt: T0 },
        ],
        enabledNetworkIds: ["1", "polkadot", "obscure-chain"],
        holdings: [
          held("1-evm-native", "1", "ethereum", 2_500, { stakedUsd: 1_000 }),
          held("1-evm-erc20-usdt", "1", "tether", 900),
          held("obscure-chain-native-OBSC", "obscure-chain", "obscure-coin", 3),
          held("polkadot-native", "polkadot", null, 0.2),
        ],
        quickUnlockEnabled: true,
      })
    )

    expect(() => catalogue.tvl_snapshot.schema.parse(result)).not.toThrow()
    expect(parseTrackedEvent({ event: "tvl_snapshot", properties: result })).toMatchObject({
      ok: true,
      event: { unlinked: true },
    })
  })
})
