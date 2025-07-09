import { BalancesStorage, getBalanceId, IBalance } from "@talismn/balances"
import { log } from "extension-shared"
import { isEqual } from "lodash"
import { BehaviorSubject, debounceTime, distinctUntilChanged, map, skip } from "rxjs"

import { getDbBlob, updateDbBlob } from "../../db"

const BLOB_ID = "balances"

type BalancesStoreData = {
  id: "balances"
} & BalancesStorage

const DEFAULT_DATA: BalancesStoreData = {
  id: "balances",
  balances: [],
  miniMetadatas: [],
}

const subjectBalancesStore = new BehaviorSubject(DEFAULT_DATA)

export const balancesStore$ = subjectBalancesStore.pipe(
  map(
    (data): BalancesStorage => ({
      balances: data.balances,
      miniMetadatas: data.miniMetadatas,
    }),
  ),
)

const cleanupBalanceForStorage = (balance: IBalance): IBalance => {
  const { networkId, address, tokenId, source, useLegacyTransferableCalculation, values, value } =
    balance
  return {
    status: "cache",
    networkId,
    address,
    tokenId,
    source,
    useLegacyTransferableCalculation,
    values,
    value,
  } as IBalance
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

// load from db and cleanup on startup
getDbBlob<"balances", BalancesStoreData>(BLOB_ID).then((storage) => {
  if (storage) subjectBalancesStore.next({ ...DEFAULT_DATA, ...storage })
})

// persist to db when store is updated
balancesStore$
  // skip 2 : one for initial value, one for the provisioning from indexed db
  .pipe(skip(2), debounceTime(2_000), distinctUntilChanged<BalancesStorage>(isEqual))
  .subscribe((storage) => {
    log.debug(
      `[balances] updating db blob with data (bal:${storage.balances.length}, meta:${storage.miniMetadatas.length})`,
    )
    updateDbBlob(BLOB_ID, { id: BLOB_ID, ...storage })
  })
