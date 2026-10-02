import { toAmountBucket, toDayBucket, toShareBucket } from "@common/analytics/buckets"
import type { Catalogue } from "@common/analytics/catalogue"
import type { PropsOfEvent } from "@common/analytics/schema"
import type { AccountType } from "@talismn/keyring"

export type TvlSnapshot = PropsOfEvent<Catalogue["tvl_snapshot"]>

/** One token held by the owned or the watched accounts, priced in USD. */
export type Holding = {
  owner: "owned" | "watched"
  tokenId: string
  networkId: string
  /** null: no CoinGecko id, so never allow-listed. */
  coingeckoId: string | null
  usd: number
  /** The part of `usd` that is staked. */
  stakedUsd: number
}

export type TvlInputs = {
  trigger: TvlSnapshot["trigger"]
  accounts: { type: AccountType; platform: string | null }[]
  mnemonics: { confirmed: boolean }[]
  enabledNetworkIds: string[]
  customNetworkCount: number
  nativeCoingeckoIdOf: (networkId: string) => string | null
  holdings: Holding[]
  allowedCoingeckoIds: ReadonlySet<string>
  stablecoinCoingeckoIds: ReadonlySet<string>
  currency: string
  installedAt: number | null
  now: number
  quickUnlockEnabled: boolean
}

/** Mobile's threshold: from $1 a network or token counts as held. */
const HELD_MIN_USD = 1
const MAX_LIST_ITEMS = 100

const sumBy = <K extends string>(holdings: readonly Holding[], keyOf: (h: Holding) => K | null) => {
  const sums = new Map<K, number>()
  for (const holding of holdings) {
    const key = keyOf(holding)
    if (key !== null) sums.set(key, (sums.get(key) ?? 0) + holding.usd)
  }
  return sums
}

const total = (holdings: readonly Holding[], amountOf: (h: Holding) => number = (h) => h.usd) =>
  holdings.reduce((sum, holding) => sum + amountOf(holding), 0)

const bucketedMostValuableFirst = (sums: readonly [string, number][]) =>
  [...sums]
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_LIST_ITEMS)
    .map(([id, usd]) => `${toAmountBucket(usd)}|${id}` as const)

/** Ids leave this function only when they are on the allow-list; every other one is counted. */
export const summariseTvl = (inputs: TvlInputs): TvlSnapshot => {
  const { accounts, holdings, allowedCoingeckoIds } = inputs
  const wallet = accounts.filter((account) => account.type !== "contact")
  const countOf = (predicate: (account: (typeof wallet)[number]) => boolean) =>
    wallet.filter(predicate).length

  const isNetworkAllowed = (networkId: string) => {
    const coingeckoId = inputs.nativeCoingeckoIdOf(networkId)
    return coingeckoId !== null && allowedCoingeckoIds.has(coingeckoId)
  }

  const owned = holdings.filter((holding) => holding.owner === "owned")
  const ownedUsd = total(owned)

  const byNetwork = [...sumBy(owned, (holding) => holding.networkId)]
  const heldNetworks = byNetwork.filter(([, usd]) => usd >= HELD_MIN_USD)
  const allowedHeldNetworks = heldNetworks.filter(([id]) => isNetworkAllowed(id))

  const heldTokens = [...sumBy(owned, (holding) => holding.tokenId)].filter(
    ([, usd]) => usd >= HELD_MIN_USD
  )
  const coingeckoIdOfToken = new Map(owned.map((holding) => [holding.tokenId, holding.coingeckoId]))
  const isTokenAllowed = (tokenId: string) => {
    const coingeckoId = coingeckoIdOfToken.get(tokenId)
    return !!coingeckoId && allowedCoingeckoIds.has(coingeckoId)
  }
  const allowedCoins = [
    ...sumBy(owned, (holding) =>
      holding.coingeckoId && allowedCoingeckoIds.has(holding.coingeckoId)
        ? holding.coingeckoId
        : null
    ),
  ].filter(([, usd]) => usd >= HELD_MIN_USD)

  return {
    trigger: inputs.trigger,
    account_count: wallet.length,
    local_count: countOf((account) => account.type === "keypair"),
    ledger_count: countOf((account) => account.type.startsWith("ledger-")),
    vault_count: countOf((account) => account.type === "polkadot-vault"),
    signet_count: countOf((account) => account.type === "signet"),
    watch_count: countOf((account) => account.type === "watch-only"),
    ethereum_count: countOf((account) => account.platform === "ethereum"),
    polkadot_count: countOf((account) => account.platform === "polkadot"),
    solana_count: countOf((account) => account.platform === "solana"),
    recovery_phrase_count: inputs.mnemonics.length,
    recovery_phrase_unbacked_count: inputs.mnemonics.filter((mnemonic) => !mnemonic.confirmed)
      .length,
    enabled_network_count: inputs.enabledNetworkIds.length,
    enabled_network_ids: inputs.enabledNetworkIds
      .filter(isNetworkAllowed)
      .sort()
      .slice(0, MAX_LIST_ITEMS),
    held_network_ids: allowedHeldNetworks
      .map(([id]) => id)
      .sort()
      .slice(0, MAX_LIST_ITEMS),
    held_network_usd_buckets: bucketedMostValuableFirst(allowedHeldNetworks),
    held_token_usd_buckets: bucketedMostValuableFirst(allowedCoins),
    other_token_count: heldTokens.filter(([tokenId]) => !isTokenAllowed(tokenId)).length,
    other_network_count: heldNetworks.length - allowedHeldNetworks.length,
    dust_network_count: byNetwork.filter(([, usd]) => usd > 0 && usd < HELD_MIN_USD).length,
    custom_network_count: inputs.customNetworkCount,
    currency: inputs.currency,
    portfolio_usd_bucket: toAmountBucket(ownedUsd),
    watched_usd_bucket: toAmountBucket(
      total(holdings.filter((holding) => holding.owner === "watched"))
    ),
    staked_share: toShareBucket(
      total(owned, (holding) => holding.stakedUsd),
      ownedUsd
    ),
    stablecoin_share: toShareBucket(
      total(
        owned.filter(
          (holding) =>
            !!holding.coingeckoId && inputs.stablecoinCoingeckoIds.has(holding.coingeckoId)
        )
      ),
      ownedUsd
    ),
    is_funded: ownedUsd > 0,
    days_since_install: toDayBucket(inputs.installedAt, inputs.now),
    quick_unlock_enabled: inputs.quickUnlockEnabled,
  }
}
