import {
  type ChainPlatform,
  CUSTOM_NETWORK_ID,
  type Signer,
  type SubmittedBy,
  signerOf,
  type TxType,
} from "@common/analytics/transactions"
import { isNetworkCustom } from "@talismn/chaindata-provider"

import { chaindataProvider } from "../../rpcs/chaindata"
import { keyringStore } from "../keyring/store"

export type NetworkRef = { networkId: string } | { genesisHash: `0x${string}` }

/** What a submit or approve message says about its transaction, read synchronously. */
export type TxAttempt = {
  platform: ChainPlatform
  network: NetworkRef
  address: string
  txType: TxType
  submittedBy: SubmittedBy
  /** The wallet signs, the dapp broadcasts. */
  signOnly: boolean
}

export type TxContext = {
  platform: ChainPlatform
  network_id: string
  tx_type: TxType
  submitted_by: SubmittedBy
  signer: Signer
}

/** Custom and unknown networks read `custom`: a user-added id can be a genesis hash. */
export const analyticsNetworkId = async (network: NetworkRef): Promise<string> => {
  const found =
    "genesisHash" in network
      ? await chaindataProvider.getNetworkByGenesisHash(network.genesisHash)
      : await chaindataProvider.getNetworkById(network.networkId)
  return found && !isNetworkCustom(found) ? found.id : CUSTOM_NETWORK_ID
}

export const signerOfAddress = async (address: string): Promise<Signer | null> => {
  const account = await keyringStore.getAccount(address)
  return account ? signerOf(account.type) : null
}

/** Null when the account is not the wallet's: nothing to attribute the transaction to. */
export const resolveTxContext = async (attempt: TxAttempt): Promise<TxContext | null> => {
  const [networkId, signer] = await Promise.all([
    analyticsNetworkId(attempt.network),
    signerOfAddress(attempt.address),
  ])
  if (!signer) return null
  return {
    platform: attempt.platform,
    network_id: networkId,
    tx_type: attempt.txType,
    submitted_by: attempt.submittedBy,
    signer,
  }
}
