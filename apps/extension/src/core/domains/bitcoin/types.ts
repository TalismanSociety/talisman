import type { BtcFeeEstimates } from "@talismn/bitcoin"
import type { BtcNetworkId } from "@talismn/chaindata-provider"

import type { WalletTransactionInfo } from "../transactions/types"

export type BitcoinTreeName = "payments" | "ordinals"

export type RequestBitcoinGetUnusedAddress = {
  networkId: BtcNetworkId
  /** account identity (payments xpub) */
  address: string
  tree: BitcoinTreeName
  chain: 0 | 1
  /** issue a fresh (never handed out) address instead of the first unused one */
  fresh?: boolean
}

export type ResponseBitcoinGetUnusedAddress = {
  address: string
  index: number
}

export type RequestBitcoinGetUtxos = {
  networkId: BtcNetworkId
  /** account identity (payments xpub) or plain on-chain address for WIF accounts */
  address: string
}

/** BitcoinUtxo with messaging-safe field types (no bigint / Uint8Array) */
export type SerializedBitcoinUtxo = {
  txid: string
  vout: number
  valueSats: string
  confirmations: number
  address: string
  addressType: "p2wpkh" | "p2tr"
  tree: BitcoinTreeName
  change: 0 | 1
  index: number
  publicKeyHex: string
}

export type ResponseBitcoinGetUtxos = {
  utxos: SerializedBitcoinUtxo[]
}

export type RequestBitcoinFeeEstimates = {
  networkId: BtcNetworkId
}

export type RequestBitcoinSubmit = {
  networkId: BtcNetworkId
  /** account identity (payments xpub) or plain on-chain address for WIF accounts */
  address: string
  /** unsigned (hot accounts) or fully signed (hardware accounts) PSBT */
  psbtBase64: string
  /** hard ceiling for the transaction fee, guards against fee computation bugs */
  maxFeeSats: string
  txInfo?: WalletTransactionInfo
}

export type ResponseBitcoinSubmit = {
  txid: string
}

export type BitcoinMessages = {
  "pri(bitcoin.address.getUnused)": [
    RequestBitcoinGetUnusedAddress,
    ResponseBitcoinGetUnusedAddress,
  ]
  "pri(bitcoin.utxos.get)": [RequestBitcoinGetUtxos, ResponseBitcoinGetUtxos]
  "pri(bitcoin.feeEstimates.get)": [RequestBitcoinFeeEstimates, BtcFeeEstimates]
  "pri(bitcoin.tx.submit)": [RequestBitcoinSubmit, ResponseBitcoinSubmit]
}
