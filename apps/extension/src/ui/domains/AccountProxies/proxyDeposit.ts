export const getProxyDeposit = (proxyCount: number, base: bigint, factor: bigint): bigint =>
  proxyCount > 0 ? base + factor * BigInt(proxyCount) : 0n
