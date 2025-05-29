import { isAccountAddressEthereum } from "@talismn/keyring"
import { firstValueFrom } from "rxjs"

import { activeEvmNetworksObservable } from "../balances/pool"
import { keyringStore } from "../keyring/store"
import { NftCollection } from "./types"

export const getNftsAccountsList = async () => {
  const accounts = await keyringStore.getAccounts()
  return accounts
    .filter(isAccountAddressEthereum)
    .map(({ address }) => address)
    .sort()
}

export const getNftsNetworkIdsList = async () => {
  return (await firstValueFrom(activeEvmNetworksObservable)).map((n) => n.id).sort()
}

export const getNftCollectionFloorUsd = (collection: NftCollection): number | null => {
  return (
    collection.marketplaces
      .filter((m) => m.floorUsd)
      .map((mp) => mp.floorUsd ?? 0)
      .sort((a, b) => a - b)[0] ?? null
  )
}
