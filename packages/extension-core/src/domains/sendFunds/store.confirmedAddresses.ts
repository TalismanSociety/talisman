import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { splitSubject } from "@talismn/util"
import { log } from "extension-shared"
import { isEqual } from "lodash-es"
import { debounceTime, distinctUntilChanged, firstValueFrom, ReplaySubject, skip } from "rxjs"

import { getBlobStore } from "../../db"
import { walletReady } from "../../libs/isWalletReady"
import { ConfirmedExternalAddresses } from "./types"

const blobStore = getBlobStore<ConfirmedExternalAddresses>("confirmed-addresses")

const DEFAULT_DATA: ConfirmedExternalAddresses = {}

const [setConfirmedAddresses, confirmedAddresses$] = splitSubject(
  new ReplaySubject<ConfirmedExternalAddresses>(1),
)

export { confirmedAddresses$ }

export const isAddressConfirmedForToken = (
  data: ConfirmedExternalAddresses,
  tokenId: string,
  address: string,
): boolean => {
  const confirmedForToken = data[tokenId] ?? []
  return confirmedForToken.some((confirmed) => isAddressEqual(confirmed, address))
}

export const addConfirmedAddress = async (tokenId: string, address: string): Promise<void> => {
  const normalized = normalizeAddress(address)
  const current = await firstValueFrom(confirmedAddresses$)

  const existingForToken = current[tokenId] ?? []

  if (existingForToken.some((a) => isAddressEqual(a, normalized))) return

  setConfirmedAddresses({
    ...current,
    [tokenId]: [...existingForToken, normalized],
  })
}

walletReady.then(() => {
  // load from storage
  blobStore
    .get()
    .then((data) => {
      setConfirmedAddresses(data ?? DEFAULT_DATA)
    })
    .catch((error) => {
      log.error("[confirmedAddresses] failed to load on startup", error)
      setConfirmedAddresses(DEFAULT_DATA)
    })

  // persist to storage on changes
  confirmedAddresses$
    .pipe(skip(1), debounceTime(1_000), distinctUntilChanged<ConfirmedExternalAddresses>(isEqual))
    .subscribe((data) => {
      log.debug("[confirmedAddresses] persisting to db")
      blobStore.set(data)
    })
})
