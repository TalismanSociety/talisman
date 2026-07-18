import { log } from "@common/log"
import { Blake2128Concat, Twox128 } from "@polkadot-api/substrate-bindings"
import { fromHex, mergeUint8, toHex } from "@polkadot-api/utils"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { decodeSs58Address, isEthereumAddress } from "@talismn/crypto"
import type { Account } from "@talismn/keyring"
import { isAccountNotContact } from "@talismn/keyring"
import { throwAfter } from "@talismn/util"
import { isEqual } from "lodash-es"
import { combineLatest, delay, filter, first, pairwise } from "rxjs"

import { isWalletReady$ } from "../../libs/isWalletReady"
import { chaindataProvider } from "../../rpcs/chaindata"
import { isAccountCompatibleWithNetwork } from "../accounts/helpers"
import { activeNetworksStore } from "../balances/store.activeNetworks"
import { keyringStore } from "../keyring/store"
import { runDiscoveryTask } from "./scheduler"
import { substrateAssetDiscoveryStore } from "./substrateStore"

// ---------------------------------------------------------------------------
// Tuning knobs
// ---------------------------------------------------------------------------

/** How long (ms) we skip re-probing a given network after a successful probe. */
const RESCAN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/** How long (ms) we skip re-probing a network whose last probe failed. */
const FAILURE_TTL_MS = 24 * 60 * 60 * 1000 // 24h — avoids hammering dead RPCs

/** Per-probe WebSocket timeout. */
const PROBE_TIMEOUT_MS = 15_000

/** Debounce for the "wallet is ready" trigger. */
const WALLET_READY_DEBOUNCE_MS = 10_000

/**
 * Max time a probe result may sit in the pending buffer before being flushed.
 * Bounds both activation latency during long probe queues and the amount of
 * probe work lost if the service worker is killed before a flush.
 */
const PENDING_FLUSH_MAX_DELAY_MS = 10_000

// ---------------------------------------------------------------------------
// Storage key helpers
// ---------------------------------------------------------------------------

// `System.Account` storage prefix: twox128("System") ++ twox128("Account").
// Stable across every standard Substrate chain — precompute once at module load.
const SYSTEM_ACCOUNT_PREFIX = mergeUint8([
  Twox128(new TextEncoder().encode("System")),
  Twox128(new TextEncoder().encode("Account")),
])

/**
 * Builds the `System.Account` storage key for a given AccountId (raw bytes).
 * Works for both 32-byte (sr25519/ed25519) and 20-byte (secp256k1 / AccountId20)
 * account ids, because both use `Blake2_128Concat` as the storage hasher.
 */
export const getSystemAccountStorageKey = (accountId: Uint8Array): `0x${string}` =>
  toHex(mergeUint8([SYSTEM_ACCOUNT_PREFIX, Blake2128Concat(accountId)])) as `0x${string}`

/**
 * Converts a wallet address to its AccountId bytes, appropriate for the network's
 * account type. Returns `null` if the address is incompatible with the network.
 */
export const addressToAccountId = (
  address: string,
  accountType: DotNetwork["account"]
): Uint8Array | null => {
  try {
    if (accountType === "secp256k1") {
      if (!isEthereumAddress(address)) return null
      return fromHex(address)
    }

    // "*25519" — substrate ss58 address, decode to the 32-byte public key
    if (isEthereumAddress(address)) return null
    const [publicKey] = decodeSs58Address(address)
    if (publicKey.length !== 32) return null
    return publicKey
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// One-shot JSON-RPC via native WebSocket
// ---------------------------------------------------------------------------

type QueryStorageChange = [key: `0x${string}`, value: `0x${string}` | null]
type QueryStorageResultItem = { block: `0x${string}`; changes: QueryStorageChange[] }

/**
 * Opens a WebSocket to a single RPC, sends one `state_queryStorageAt` request,
 * and disconnects in `finally`. Returns the raw storage changes.
 *
 * Here we do not want to use our chain connector which is designed to be shared and stay alive for longer periods.
 *
 * Throws on any error (connection, timeout, RPC error). Callers should retry
 * with the next RPC url.
 */
const probeRpc = async (
  rpcUrl: string,
  storageKeys: `0x${string}`[],
  signal: AbortSignal
): Promise<QueryStorageResultItem> => {
  return await new Promise<QueryStorageResultItem>((resolve, reject) => {
    let socket: WebSocket | null = null
    let settled = false

    const cleanup = () => {
      if (socket) {
        try {
          // 1000 = normal closure
          socket.close(1000)
        } catch {
          // ignore
        }
        socket = null
      }
      signal.removeEventListener("abort", onAbort)
    }

    const done = (result: QueryStorageResultItem) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    const fail = (err: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err instanceof Error ? err : new Error(String(err)))
    }

    const onAbort = () => fail(new Error("Aborted"))
    if (signal.aborted) return fail(new Error("Aborted"))
    signal.addEventListener("abort", onAbort, { once: true })

    try {
      socket = new WebSocket(rpcUrl)
    } catch (err) {
      return fail(err)
    }

    socket.onopen = () => {
      try {
        socket?.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "state_queryStorageAt",
            params: [storageKeys],
          })
        )
      } catch (err) {
        fail(err)
      }
    }

    socket.onerror = (ev) => {
      fail(new Error(`WebSocket error on ${rpcUrl}: ${(ev as ErrorEvent)?.message ?? "unknown"}`))
    }

    socket.onclose = () => {
      // If we haven't received a response yet, this is an error.
      if (!settled) fail(new Error(`WebSocket closed before receiving a response from ${rpcUrl}`))
    }

    socket.onmessage = (ev) => {
      try {
        const payload = JSON.parse(typeof ev.data === "string" ? ev.data : "")
        if (payload?.id !== 1) return // not our response (shouldn't happen for one-shot usage)
        if (payload.error) {
          fail(new Error(`RPC error: ${payload.error.message ?? JSON.stringify(payload.error)}`))
          return
        }
        const result = Array.isArray(payload.result) ? payload.result[0] : payload.result
        if (!result || !Array.isArray(result.changes)) {
          fail(new Error("Unexpected state_queryStorageAt response shape"))
          return
        }
        done(result as QueryStorageResultItem)
      } catch (err) {
        fail(err)
      }
    }
  })
}

/**
 * Tries each of a network's rpcs in order until one returns a response.
 * Disposes each socket cleanly before moving on.
 */
const probeNetworkRpcs = async (
  rpcs: string[],
  storageKeys: `0x${string}`[],
  signal: AbortSignal
): Promise<QueryStorageResultItem> => {
  let lastErr: unknown
  for (const rpc of rpcs) {
    if (signal.aborted) throw new Error("Aborted")

    // Per-RPC abort controller: ensures the WebSocket is closed immediately
    // on timeout (or outer abort) before we move on to the next endpoint.
    const perRpcAbort = new AbortController()
    const onOuterAbort = () => perRpcAbort.abort()
    signal.addEventListener("abort", onOuterAbort, { once: true })

    try {
      return await Promise.race([
        probeRpc(rpc, storageKeys, perRpcAbort.signal),
        throwAfter(PROBE_TIMEOUT_MS, "Timeout"),
      ])
    } catch (err) {
      lastErr = err
      log.debug(`[substrateDiscovery] probe failed on ${rpc}`, err)
    } finally {
      perRpcAbort.abort()
      signal.removeEventListener("abort", onOuterAbort)
    }
  }
  throw lastErr ?? new Error("No RPCs available")
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

type NetworkProbeCandidate = {
  network: DotNetwork
  /** Compatible accounts paired with their raw AccountId bytes. */
  addresses: Array<{ address: string; accountId: Uint8Array }>
}

/**
 * Per-network generation counter. Bumped by `clearEntriesForAccounts` when
 * new accounts invalidate cached probe results. `probeAndActivate` captures
 * the generation before probing and only writes the result timestamp if the
 * generation hasn't changed — preventing a stale in-flight probe from
 * overwriting a clear triggered by newly added accounts.
 */
const probeGeneration = new Map<string, number>()

/**
 * Collects probe candidates for the substrate asset discovery flow.
 *
 * Uses the canonical `isAccountCompatibleWithNetwork` helper to match
 * accounts to networks, handling genesisHash constraints, ledger quirks, etc.
 *
 * Candidate network rules:
 *   - platform "polkadot"
 *   - not a testnet
 *   - `isDefault: false`  (active-by-default networks are out of scope)
 *   - no explicit user override (activeNetworks[id] === undefined)
 *   - has at least one rpc endpoint
 *   - has at least one compatible account
 */
const getProbeCandidates = async (): Promise<NetworkProbeCandidate[]> => {
  const [networks, activeNetworks, accounts] = await Promise.all([
    chaindataProvider.getNetworks("polkadot"),
    activeNetworksStore.get(),
    keyringStore.getAccounts(),
  ])

  const eligibleAccounts = accounts.filter(isAccountNotContact)

  return networks
    .filter((n) => !n.isTestnet)
    .filter((n) => n.isDefault === false)
    .filter((n) => activeNetworks[n.id] === undefined)
    .filter((n) => Array.isArray(n.rpcs) && n.rpcs.length > 0)
    .map<NetworkProbeCandidate | null>((network) => {
      const pairs = eligibleAccounts
        .filter((account) => isAccountCompatibleWithNetwork(network, account))
        .map((account) => {
          const accountId = addressToAccountId(account.address, network.account)
          return accountId ? { address: account.address, accountId } : null
        })
        .filter((p): p is { address: string; accountId: Uint8Array } => p !== null)

      if (!pairs.length) return null
      return { network, addresses: pairs }
    })
    .filter((c): c is NetworkProbeCandidate => c !== null)
}

/** Returns `true` if the given timestamp is still "fresh" enough to skip probing. */
const isFresh = (timestamp: number | undefined): boolean => {
  if (timestamp === undefined) return false
  return Date.now() - timestamp < RESCAN_TTL_MS
}

/**
 * Successful probes of live networks are buffered here instead of being
 * activated one by one: every activeNetworks write restarts the balances
 * aggregation pipeline downstream, so a probe storm (fresh install, new
 * account) must collapse into as few writes as possible.
 *
 * Crash safety: a pending entry has NO timestamp in substrateAssetDiscoveryStore
 * yet (the entry was cleared before probing). If the service worker dies before
 * the flush, the network is simply re-probed on next startup.
 */
const pendingProbeResults = new Map<string, { alive: boolean; enqueueGen: number }>()
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null

const schedulePendingFlush = () => {
  if (pendingFlushTimer) return
  pendingFlushTimer = setTimeout(() => {
    flushPendingProbeResults().catch((err) =>
      log.error("[substrateDiscovery] Failed to flush pending probe results", err)
    )
  }, PENDING_FLUSH_MAX_DELAY_MS)
}

/**
 * Applies buffered probe results in one batch: a single activeNetworks write
 * for all live networks, then the probe timestamps. Ordering matters — if the
 * process dies between the two writes, the networks are active but unstamped,
 * and `getProbeCandidates` already excludes active networks from re-probing.
 */
const flushPendingProbeResults = async (): Promise<void> => {
  if (pendingFlushTimer) {
    clearTimeout(pendingFlushTimer)
    pendingFlushTimer = null
  }

  if (!pendingProbeResults.size) return
  const pending = new Map(pendingProbeResults)
  pendingProbeResults.clear()

  const activeNetworks = await activeNetworksStore.get()

  // Drop results whose generation was bumped while buffered (new accounts arrived —
  // a re-probe with the full address set is already queued) and networks the user
  // explicitly toggled in the meantime.
  const applicable = [...pending.entries()].filter(
    ([networkId, { enqueueGen }]) =>
      (probeGeneration.get(networkId) ?? 0) === enqueueGen &&
      activeNetworks[networkId] === undefined
  )
  if (!applicable.length) return

  const aliveNetworkIds = applicable.filter(([, { alive }]) => alive).map(([id]) => id)
  if (aliveNetworkIds.length) {
    log.debug(
      `[substrateDiscovery] found live account(s) on ${aliveNetworkIds.length} network(s) — auto-activating`,
      aliveNetworkIds
    )
    await activeNetworksStore.set(Object.fromEntries(aliveNetworkIds.map((id) => [id, true])))
  }

  const now = Date.now()
  await substrateAssetDiscoveryStore.set(
    Object.fromEntries(applicable.map(([networkId]) => [networkId, now]))
  )
}

const probeAndActivate = async (
  candidate: NetworkProbeCandidate,
  enqueueGen: number
): Promise<void> => {
  const { network, addresses } = candidate

  // If the generation was bumped since this job was enqueued (e.g. new accounts
  // arrived), skip — a newer job with the correct address set is already queued.
  if ((probeGeneration.get(network.id) ?? 0) !== enqueueGen) return

  // Re-check "still a candidate" at dequeue time — activeNetworks may have
  // been mutated by the user or by another scan while we were waiting.
  const activeNetworks = await activeNetworksStore.get()
  if (activeNetworks[network.id] !== undefined) return

  const prevTimestamp = (await substrateAssetDiscoveryStore.get())[network.id]
  if (isFresh(prevTimestamp)) return

  // Clear the entry before probing: if the process is killed mid-probe,
  // the missing entry ensures we retry on next startup.
  await substrateAssetDiscoveryStore.mutate((state) => {
    const { [network.id]: _, ...rest } = state
    return rest
  })

  const storageKeys = addresses.map((a) => getSystemAccountStorageKey(a.accountId))
  const abortController = new AbortController()

  try {
    const result = await probeNetworkRpcs(network.rpcs, storageKeys, abortController.signal)

    const alive = result.changes.some(([, value]) => value !== null && value !== undefined)
    log.debug(
      alive
        ? `[substrateDiscovery] found live account(s) on ${network.id} — queuing activation`
        : `[substrateDiscovery] no accounts alive on ${network.id}`
    )

    // Buffer instead of writing: activation and timestamp are applied together
    // by flushPendingProbeResults (queue idle, or PENDING_FLUSH_MAX_DELAY_MS).
    pendingProbeResults.set(network.id, { alive, enqueueGen })
    schedulePendingFlush()
  } catch (err) {
    log.debug(`[substrateDiscovery] probe failed on ${network.id}`, err)
    // Failures don't trigger downstream work, so the retry timestamp is written
    // immediately — no need to buffer it.
    if ((probeGeneration.get(network.id) ?? 0) === enqueueGen) {
      await substrateAssetDiscoveryStore.set({
        [network.id]: Date.now() - (RESCAN_TTL_MS - FAILURE_TTL_MS),
      })
    }
  } finally {
    abortController.abort()
  }
}

/**
 * Enqueues liveness probes for every inactive-by-default substrate network
 * that has compatible user accounts. Safe to call repeatedly — the queue
 * coalesces work and the per-network TTL prevents duplicate effort.
 */
const discoverSubstrateAssets = async (): Promise<void> => {
  try {
    const candidates = await getProbeCandidates()
    if (!candidates.length) return

    log.debug(
      `[substrateDiscovery] enqueuing probes for ${candidates.length} network(s)`,
      candidates.map((c) => c.network.id)
    )

    // Fire-and-forget: the shared discovery queue caps concurrent RPC work across
    // all discovery types (evm/substrate/solana) and spaces it out while a UI is open.
    const probes = candidates.map((candidate) => {
      // Capture generation at enqueue time so stale jobs are skipped at dequeue.
      const gen = probeGeneration.get(candidate.network.id) ?? 0
      return runDiscoveryTask(() => probeAndActivate(candidate, gen)).catch((err) => {
        log.warn(`[substrateDiscovery] queued probe failed for ${candidate.network.id}`, err)
      })
    })

    // Flush buffered results as soon as this batch of probes settles (long queues
    // also flush every PENDING_FLUSH_MAX_DELAY_MS, see schedulePendingFlush).
    Promise.allSettled(probes)
      .then(() => flushPendingProbeResults())
      .catch((err) => log.error("[substrateDiscovery] Failed to flush after probes settled", err))
  } catch (err) {
    log.error("[substrateDiscovery] Failed to enqueue substrate asset discovery", err)
  }
}

/**
 * Clears stored probe timestamps for all networks that are compatible with the
 * given accounts. This forces those networks to be re-probed on the next run,
 * ensuring newly added accounts are checked everywhere.
 */
const clearEntriesForAccounts = async (newAccounts: Account[]): Promise<void> => {
  const [networks, activeNetworks] = await Promise.all([
    chaindataProvider.getNetworks("polkadot"),
    activeNetworksStore.get(),
  ])

  const candidateNetworks = networks
    .filter((n) => !n.isTestnet)
    .filter((n) => n.isDefault === false)
    .filter((n) => activeNetworks[n.id] === undefined)
    .filter((n) => Array.isArray(n.rpcs) && n.rpcs.length > 0)

  // Find which networks any of the new accounts are compatible with.
  const networkIdsToClear = candidateNetworks
    .filter((network) =>
      newAccounts.some((account) => isAccountCompatibleWithNetwork(network, account))
    )
    .map((n) => n.id)

  if (!networkIdsToClear.length) return

  log.debug(`[substrateDiscovery] clearing ${networkIdsToClear.length} entries for new accounts`)

  // Bump generation for each cleared network so in-flight probes know their
  // result is stale and won't overwrite the cleared entry. Buffered results for
  // these networks are stale too — drop them so they can't be flushed.
  for (const id of networkIdsToClear) {
    probeGeneration.set(id, (probeGeneration.get(id) ?? 0) + 1)
    pendingProbeResults.delete(id)
  }

  await substrateAssetDiscoveryStore.mutate((state) => {
    const next = { ...state }
    for (const id of networkIdsToClear) delete next[id]
    return next
  })
}

// ---------------------------------------------------------------------------
// Public: wire up triggers
// ---------------------------------------------------------------------------

export const initialiseSubstrateAssetDiscovery = () => {
  // (1) On wallet unlock, run once after a short delay (to avoid piling on top
  //     of other startup work and duplicating with existing EVM discovery).
  isWalletReady$
    .pipe(
      filter((ready) => ready),
      first(),
      delay(WALLET_READY_DEBOUNCE_MS)
    )
    .subscribe(() => {
      log.debug("[substrateDiscovery] wallet ready, launching initial substrate probes")
      discoverSubstrateAssets()
    })

  // (2) When new accounts are added, clear cached timestamps for compatible
  //     networks so they will be re-probed with the full set of addresses.
  combineLatest({
    isWalletReady: isWalletReady$,
    accounts: keyringStore.accounts$,
  })
    .pipe(
      filter(({ isWalletReady }) => !!isWalletReady),
      pairwise(),
      filter(([prev, curr]) => {
        const a = prev.accounts.filter(isAccountNotContact).map((x) => x.address)
        const b = curr.accounts.filter(isAccountNotContact).map((x) => x.address)
        return !isEqual(a.sort(), b.sort()) && b.length > a.length
      })
    )
    .subscribe(([prev, curr]) => {
      const prevAddresses = new Set(prev.accounts.filter(isAccountNotContact).map((a) => a.address))
      const newAccounts = curr.accounts
        .filter(isAccountNotContact)
        .filter((a) => !prevAddresses.has(a.address))

      if (!newAccounts.length) return
      log.debug(
        `[substrateDiscovery] ${newAccounts.length} new account(s), clearing entries & re-probing`
      )
      clearEntriesForAccounts(newAccounts).then(
        () => discoverSubstrateAssets(),
        (err) => log.error("[substrateDiscovery] Failed to handle new accounts", err)
      )
    })
}

// Exported for unit tests.
export const __internal = {
  getProbeCandidates,
  isFresh,
  probeAndActivate,
  clearEntriesForAccounts,
  pendingProbeResults,
  flushPendingProbeResults,
}
