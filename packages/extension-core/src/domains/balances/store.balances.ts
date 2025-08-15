import { BalanceJson, BalancesStorage, getBalanceId } from "@talismn/balances"
import { isAccountNotContact } from "@talismn/keyring"
import { splitSubject } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { keyringStore } from "../keyring/store"

const blobStore = getBlobStore<BalancesStorage>("balances")

const DEFAULT_DATA: BalancesStorage = {
  balances: [],
  /**
   * NOTE: these are miniMetadatas needed for e.g. custom or out-of-date chains,
   * they are not the same as the default miniMetadatas in the chaindata blob.
   */
  miniMetadatas: [],
}

// balances store
const [setBalances, balancesStore$] = splitSubject(new ReplaySubject<BalancesStorage>(1))
export { balancesStore$ }

export const updateBalancesStore = (data: BalancesStorage) => {
  setBalances({
    balances: data.balances
      .map(function cleanupBalanceForStorage(balance: BalanceJson): BalanceJson {
        const {
          networkId,
          address,
          tokenId,
          source,
          useLegacyTransferableCalculation,
          values,
          value,
        } = balance
        return {
          // mark as cache and enforce property ordering for consistency
          status: "cache",
          networkId,
          address,
          tokenId,
          source,
          useLegacyTransferableCalculation,
          values: values!,
          value,
        }
      })
      // enforce consistent ordering of balances and miniMetadatas to allow for easier change comparison
      .sort((a, b) => getBalanceId(a).localeCompare(getBalanceId(b))),
    miniMetadatas: data.miniMetadatas.concat().sort((a, b) => a.id.localeCompare(b.id)),
  })
}

// once wallet is ready, initialize the balances store
walletReady.then(() => {
  // provision store data from db
  Promise.all([blobStore.get(), keyringStore.getAccounts()])
    .then(([blobData, accounts]) => {
      if (!blobData) return setBalances(DEFAULT_DATA)

      const addresses = new Set(accounts.filter(isAccountNotContact).map((a) => a.address))
      // filter out any balances that do not match a keyring address
      const balances = blobData.balances.filter((b) => addresses.has(b.address))
      const miniMetadatas = blobData.miniMetadatas

      if (balances.length !== blobData.balances.length)
        log.debug(
          `[balances] deleting ${blobData.balances.length - balances.length} balances that do not match keyring addresses`,
        )

      setBalances({
        ...DEFAULT_DATA,
        balances,
        miniMetadatas,
      })
    })
    .catch((error) => {
      log.error("[balances] failed to load balances store on startup", error)
      // need at least one emit on startup as it's a replay subject
      setBalances(DEFAULT_DATA)
    })

  // persist data to db when store is updated
  balancesStore$
    .pipe(skip(1), debounceTime(2_000), distinctUntilChanged<BalancesStorage>(isEqual))
    .subscribe((storage) => {
      log.debug(
        `[balances] updating db blob with data (bal:${storage.balances.length}, meta:${storage.miniMetadatas.length})`,
      )
      blobStore.set(storage)
    })
})
