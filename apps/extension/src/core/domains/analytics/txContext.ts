import { networkIdForAnalytics } from "@common/analytics/funds"
import {
  type ChainPlatform,
  type Signer,
  type SubmittedBy,
  signerOf,
  type TxType,
} from "@common/analytics/transactions"

import { chaindataProvider } from "../../rpcs/chaindata"
import { keyringStore } from "../keyring/store"

export type NetworkRef = { networkId: string } | { genesisHash: `0x${string}` }

export type TxAttempt = {
  platform: ChainPlatform
  network: NetworkRef
  address: string
  txType: TxType
  submittedBy: SubmittedBy
  signOnly: boolean
}

export type TxContext = {
  platform: ChainPlatform
  network_id: string
  tx_type: TxType
  submitted_by: SubmittedBy
  signer: Signer
}

export const analyticsNetworkId = async (network: NetworkRef): Promise<string> =>
  networkIdForAnalytics(
    "genesisHash" in network
      ? await chaindataProvider.getNetworkByGenesisHash(network.genesisHash)
      : await chaindataProvider.getNetworkById(network.networkId)
  )

export const signerOfAddress = async (address: string): Promise<Signer | null> => {
  const account = await keyringStore.getAccount(address)
  return account ? signerOf(account.type) : null
}

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
