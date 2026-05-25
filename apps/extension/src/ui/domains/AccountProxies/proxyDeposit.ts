import type { AccountProxySet } from "@core/domains/accountProxies/types"

export const getProxyDeposit = (proxyCount: number, base: bigint, factor: bigint): bigint =>
  proxyCount > 0 ? base + factor * BigInt(proxyCount) : 0n

export const getProxyCountForNetwork = (
  proxySets: Pick<AccountProxySet, "networkId" | "proxyCount">[],
  networkId: string
): number =>
  proxySets
    .filter((proxySet) => proxySet.networkId === networkId)
    .reduce((sum, proxySet) => sum + proxySet.proxyCount, 0)
