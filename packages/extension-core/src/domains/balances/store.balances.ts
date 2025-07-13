import { BalanceJson, BalancesStorage, getBalanceId } from "@talismn/balances"
import { isAccountNotContact } from "@talismn/keyring"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, map, ReplaySubject, skip } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"
import { keyringStore } from "../keyring/store"

const BLOB_ID = "balances"

type BalancesStoreData = {
  id: "balances"
} & BalancesStorage

const DEFAULT_DATA: BalancesStoreData = {
  id: "balances",
  balances: [],
  miniMetadatas: [],
}

const subjectBalancesStore = new ReplaySubject<BalancesStoreData>(1)

// load from db and cleanup on startup
Promise.all([getDbBlob<"balances", BalancesStoreData>(BLOB_ID), keyringStore.getAccounts()])
  .then(([storage, accounts]) => {
    if (!storage) return

    const addresses = new Set(accounts.filter(isAccountNotContact).map((a) => a.address))
    const balances = storage.balances.filter((b) => addresses.has(b.address))

    if (balances.length !== storage.balances.length)
      log.debug(
        `[balances] deleting ${storage.balances.length - balances.length} balances that do not match keyring addresses`,
      )

    subjectBalancesStore.next({
      ...DEFAULT_DATA,
      ...storage,
      // remove all balances that do not match a keyring address
      balances,
    })
  })
  .catch((error) => {
    log.error("[balances] failed to cleanup balances store on startup", error)
    // need at least one emit on startup as it's a replay subject
    subjectBalancesStore.next(DEFAULT_DATA)
  })

export const balancesStore$ = subjectBalancesStore.pipe(
  map(
    (data): BalancesStorage => ({
      balances: data.balances,
      miniMetadatas: data.miniMetadatas,
    }),
  ),
)

const cleanupBalanceForStorage = (balance: BalanceJson): BalanceJson => {
  const { networkId, address, tokenId, source, useLegacyTransferableCalculation, values, value } =
    balance
  return {
    // mark as cache and enforce property ordering for consistency
    status: "cache",
    networkId,
    address,
    tokenId,
    source,
    useLegacyTransferableCalculation,
    values,
    value,
  } as BalanceJson
}

export const updateBalancesStore = (data: BalancesStorage) => {
  subjectBalancesStore.next({
    id: BLOB_ID,
    balances: data.balances
      .map(cleanupBalanceForStorage)
      // enforce consistent ordering of balances and miniMetadatas to allow for easier change comparison
      .sort((a, b) => getBalanceId(a).localeCompare(getBalanceId(b))),
    miniMetadatas: data.miniMetadatas.concat().sort((a, b) => a.id.localeCompare(b.id)),
  })
}

// persist data to db when store is updated
balancesStore$
  // skip 2 : one for initial value, one for the above provisioning from indexed db
  .pipe(skip(2), debounceTime(2_000), distinctUntilChanged<BalancesStorage>(isEqual))
  .subscribe((storage) => {
    log.debug(
      `[balances] updating db blob with data (bal:${storage.balances.length}, meta:${storage.miniMetadatas.length})`,
    )
    updateDbBlob(BLOB_ID, { id: BLOB_ID, ...storage })
  })
