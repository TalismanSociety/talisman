import { log } from "@common/log"
import { isAccountNotContact } from "@talismn/keyring"
import { splitSubject } from "@talismn/util"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { keyringStore } from "../keyring/store"
import type { AccountProxiesSnapshot, AccountProxySet } from "./types"

const blobStore = getBlobStore<AccountProxiesSnapshot>("account-proxies")

const DEFAULT_DATA: AccountProxiesSnapshot = { sets: {} }

const [setSnapshot, accountProxiesStore$] = splitSubject(
  new ReplaySubject<AccountProxiesSnapshot>(1)
)
export { accountProxiesStore$ }

/** Emits once after the initial blob load completes (success or error). */
const [setHydrated, storeHydrated$] = splitSubject(new ReplaySubject<true>(1))
export { storeHydrated$ }

export const getAccountProxySetKey = (networkId: string, delegator: string) =>
  `${networkId}|${delegator}`

let currentSnapshot: AccountProxiesSnapshot = DEFAULT_DATA

const emit = (next: AccountProxiesSnapshot) => {
  currentSnapshot = next
  setSnapshot(next)
}

/** Replace one or more (networkId, delegator) sets atomically. */
export const upsertAccountProxySets = (sets: AccountProxySet[]) => {
  if (sets.length === 0) return
  const next: AccountProxiesSnapshot = { sets: { ...currentSnapshot.sets } }
  for (const set of sets) {
    next.sets[getAccountProxySetKey(set.networkId, set.delegator)] = set
  }
  emit(next)
}

/** Mark sets as stale without touching their proxies/deposit. */
export const markAccountProxySetsStale = (
  keys: Array<{ networkId: string; delegator: string }>
) => {
  if (keys.length === 0) return
  const next: AccountProxiesSnapshot = { sets: { ...currentSnapshot.sets } }
  let dirty = false
  for (const { networkId, delegator } of keys) {
    const key = getAccountProxySetKey(networkId, delegator)
    const current = next.sets[key]
    if (current && !current.isStale) {
      next.sets[key] = { ...current, isStale: true }
      dirty = true
    }
  }
  if (dirty) emit(next)
}

/** Remove sets for delegators that are no longer in the user's wallet. */
const pruneSnapshot = (
  snapshot: AccountProxiesSnapshot,
  validAddresses: Set<string>
): AccountProxiesSnapshot => {
  const sets: Record<string, AccountProxySet> = {}
  for (const [key, set] of Object.entries(snapshot.sets)) {
    if (validAddresses.has(set.delegator)) sets[key] = set
  }
  return { sets }
}

walletReady.then(() => {
  Promise.all([blobStore.get(), keyringStore.getAccounts()])
    .then(([blobData, accounts]) => {
      const validAddresses = new Set(accounts.filter(isAccountNotContact).map((a) => a.address))
      let snapshot = blobData ? pruneSnapshot(blobData, validAddresses) : DEFAULT_DATA

      // Backward compatibility: derive proxyCount from proxies.length for old data
      const migrated: Record<string, AccountProxySet> = {}
      let needsMigration = false
      for (const [key, set] of Object.entries(snapshot.sets)) {
        if (typeof set.proxyCount !== "number") {
          needsMigration = true
          migrated[key] = { ...set, proxyCount: set.proxies?.length ?? 0 }
        } else {
          migrated[key] = set
        }
      }
      if (needsMigration) snapshot = { sets: migrated }

      emit(snapshot)
      setHydrated(true)
    })
    .catch((err) => {
      log.error("[accountProxies] failed to load store on startup", err)
      emit(DEFAULT_DATA)
      setHydrated(true)
    })

  // persist data to db when store is updated
  accountProxiesStore$
    .pipe(skip(1), debounceTime(2_000), distinctUntilChanged<AccountProxiesSnapshot>(isEqual))
    .subscribe((snapshot) => {
      const count = Object.keys(snapshot.sets).length
      log.debug(`[accountProxies] persisting snapshot (sets:${count})`)
      blobStore.set(snapshot)
    })
})
