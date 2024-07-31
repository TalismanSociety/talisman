import keyring from "@polkadot/ui-keyring"
import { isEthereumAddress } from "@talismn/util"
import { firstValueFrom } from "rxjs"

import { activeEvmNetworksObservable } from "../balances/pool"
import { NftCollection } from "./types"

/**
 * IMPORTANT : make sure keyring is loaded before calling this
 *
 * @returns list of evm addresses from keyring
 */
export const getNftsAccountsList = () => {
  return keyring
    .getAccounts()
    .map(({ address }) => address)
    .filter(isEthereumAddress)
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
