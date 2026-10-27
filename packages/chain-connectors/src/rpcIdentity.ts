import log from "./log"

/**
 * Chain identity checks for the RPCs the connectors use.
 *
 * A network's RPCs come from chaindata, which is fetched unsigned, or from the
 * user's edits. An RPC is only used once it has answered with the genesis hash
 * (Polkadot SDK, Solana) or chain id (EVM) the network record names. The
 * verdict for each (network, RPC) pair is kept for the life of the process, so
 * the check costs one round trip per RPC. A probe that fails or times out
 * leaves no verdict, and the RPC is probed again on its next use.
 */
export type IdentityVerdict = "match" | "mismatch"

const verdicts = new Map<string, IdentityVerdict>()

const key = (networkId: string, rpcUrl: string) => `${networkId}|${rpcUrl}`

export const getIdentityVerdict = (
  networkId: string,
  rpcUrl: string
): IdentityVerdict | undefined => verdicts.get(key(networkId, rpcUrl))

export const recordIdentityVerdict = (
  networkId: string,
  rpcUrl: string,
  verdict: IdentityVerdict
): void => {
  if (verdict === "mismatch" && verdicts.get(key(networkId, rpcUrl)) !== "mismatch")
    log.warn(`RPC ${rpcUrl} does not serve network ${networkId}; it will not be used`)
  verdicts.set(key(networkId, rpcUrl), verdict)
}

/** Whether the RPC is known to serve another chain */
export const isKnownMismatch = (networkId: string, rpcUrl: string): boolean =>
  getIdentityVerdict(networkId, rpcUrl) === "mismatch"

/** Test hook: forgets every verdict recorded in this process */
export const resetIdentityVerdicts = (): void => {
  verdicts.clear()
}

/**
 * Compares two genesis hashes. Polkadot SDK hashes are `0x`-prefixed hex and
 * compared case-insensitively; Solana hashes are base58 and compared verbatim.
 */
export const genesisHashMatches = (expected: string, actual: string): boolean => {
  const normalise = (hash: string) => (/^0x/i.test(hash) ? hash.toLowerCase() : hash)
  return normalise(expected) === normalise(actual)
}

/**
 * Whether an `eth_chainId` answer names `expectedChainId`. Compared
 * numerically so a hex or zero-padded answer cannot cause a false mismatch.
 */
export const evmChainIdMatches = (expectedChainId: number, actual: unknown): boolean => {
  const parsed =
    typeof actual === "number" ? actual : typeof actual === "string" ? Number(actual) : NaN
  return Number.isFinite(parsed) && parsed === expectedChainId
}

/** Rejects after `ms`. The wrapped promise keeps running; callers own any clean-up. */
export const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
