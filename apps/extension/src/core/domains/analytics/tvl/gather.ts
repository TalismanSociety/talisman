import { type Balance, Balances, type BalancesResult } from "@talismn/balances"
import { isNetworkCustom } from "@talismn/chaindata-provider"
import { getAccountPlatformFromAddress, normalizeAddress } from "@talismn/crypto"
import { isAccountOwned } from "@talismn/keyring"
import { firstValueFrom } from "rxjs"

import { chaindataProvider } from "../../../rpcs/chaindata"
import { isCompleteEnrollment, quickUnlockStore } from "../../app/store.quickUnlock"
import { settingsStore } from "../../app/store.settings"
import { activeNetworksStore, isNetworkActive } from "../../chaindata/store.activeNetworks"
import { keyringStore } from "../../keyring/store"
import { tokenRatesStore } from "../../tokenRates"
import { analyticsLifecycleStore } from "../store.lifecycle"
import { TVL_ALLOWED_COINGECKO_IDS, TVL_STABLECOIN_COINGECKO_IDS } from "./allowList.gen"
import type { Holding, TvlInputs } from "./summarise"

const STAKING_LOCK_LABEL = /stak|stkng|nompool/i

const platformOf = (address: string) => {
  try {
    return getAccountPlatformFromAddress(address)
  } catch {
    return null
  }
}

/** Native staking locks, nomination pools, and Bittensor stake, which is the whole dTao balance. */
const stakedUsdOf = (balance: Balance) => {
  if (balance.token?.type === "substrate-dtao") return balance.total.fiat("usd") ?? 0
  const staked = [
    ...balance.locks.filter((lock) => STAKING_LOCK_LABEL.test(String(lock.label))),
    ...balance.nompools,
  ]
  return staked.reduce((sum, value) => sum + (value.amount.fiat("usd") ?? 0), 0)
}

export const gatherTvlInputs = async (
  trigger: TvlInputs["trigger"],
  live: BalancesResult
): Promise<TvlInputs> => {
  const [
    accounts,
    mnemonics,
    networks,
    activeNetworks,
    tokens,
    { tokenRates },
    { selectedCurrency },
    quickUnlock,
    { installedAt },
  ] = await Promise.all([
    keyringStore.getAccounts(),
    keyringStore.getMnemonics(),
    chaindataProvider.getNetworks(),
    activeNetworksStore.get(),
    chaindataProvider.getTokensMapById(),
    firstValueFrom(tokenRatesStore.storage$),
    settingsStore.get(),
    quickUnlockStore.get(),
    analyticsLifecycleStore.get(),
  ])

  const ownerOf = new Map<string, Holding["owner"]>()
  for (const account of accounts) {
    const owner = isAccountOwned(account)
      ? "owned"
      : account.type === "watch-only"
        ? "watched"
        : null
    if (owner) ownerOf.set(normalizeAddress(account.address), owner)
  }

  const holdingsByKey = new Map<string, Holding>()
  for (const balance of new Balances(live.balances, { tokens, tokenRates }).each) {
    const owner = ownerOf.get(normalizeAddress(balance.address))
    if (!owner) continue
    const key = `${owner}:${balance.tokenId}`
    const holding = holdingsByKey.get(key) ?? {
      owner,
      tokenId: balance.tokenId,
      networkId: balance.networkId,
      coingeckoId: balance.token?.coingeckoId ?? null,
      usd: 0,
      stakedUsd: 0,
    }
    holding.usd += balance.total.fiat("usd") ?? 0
    holding.stakedUsd += stakedUsdOf(balance)
    holdingsByKey.set(key, holding)
  }

  const networksById = new Map(networks.map((network) => [network.id, network]))

  return {
    trigger,
    accounts: accounts.map((account) => ({
      type: account.type,
      platform: platformOf(account.address),
    })),
    mnemonics,
    enabledNetworkIds: networks
      .filter((network) => isNetworkActive(network, activeNetworks))
      .map((network) => network.id),
    customNetworkCount: networks.filter(isNetworkCustom).length,
    // a custom network is never named: its id can be a genesis hash
    nativeCoingeckoIdOf: (networkId) => {
      const network = networksById.get(networkId)
      if (!network || isNetworkCustom(network)) return null
      return tokens[network.nativeTokenId]?.coingeckoId ?? null
    },
    holdings: [...holdingsByKey.values()],
    allowedCoingeckoIds: new Set(TVL_ALLOWED_COINGECKO_IDS),
    stablecoinCoingeckoIds: new Set(TVL_STABLECOIN_COINGECKO_IDS),
    currency: selectedCurrency,
    installedAt,
    now: Date.now(),
    quickUnlockEnabled: isCompleteEnrollment(quickUnlock),
  }
}
