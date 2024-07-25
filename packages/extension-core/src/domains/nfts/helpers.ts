import keyring from "@polkadot/ui-keyring"
import { isEthereumAddress } from "@talismn/util"
import { firstValueFrom } from "rxjs"

import { activeEvmNetworksObservable } from "../balances/pool"

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
