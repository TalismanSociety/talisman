import keyring from "@polkadot/ui-keyring"
import { isEthereumAddress } from "@talismn/util"

/**
 * IMPORTANT : make sure keyring is loaded before calling this
 *
 * @returns list of evm addresses from keyring
 */
export const getNftsAccountsList = () =>
  keyring
    .getAddresses()
    .map(({ address }) => address)
    .filter(isEthereumAddress)
