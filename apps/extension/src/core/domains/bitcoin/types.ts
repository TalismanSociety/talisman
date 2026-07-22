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
  /** chain tip at scan time — used as anti-fee-sniping nLockTime by the PSBT builder */
  tipHeight: number
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
  /** BIP125 replacement: txid of the pending transaction this one replaces */
  replacesTxid?: string
  txInfo?: WalletTransactionInfo
}

export type ResponseBitcoinSubmit = {
  txid: string
}

export type RequestBitcoinReplacePreview = {
  networkId: BtcNetworkId
  /** txid of the pending transaction to replace */
  txid: string
  type: "speed-up" | "cancel"
  feeRateSatVb: number
}

export type ResponseBitcoinReplacePreview = {
  /** unsigned replacement PSBT */
  psbtBase64: string
  feeSats: string
  sentSats: string
  /** tree the replacement spends — drives the ledger wallet policy */
  tree: BitcoinTreeName
}

export type RequestBitcoinAccountPreview = {
  networkId: BtcNetworkId
  /** account-level payments xpub to preview */
  paymentsXpub: string
}

export type ResponseBitcoinAccountPreview = {
  /** first payments (bc1q) receive address */
  firstAddress: string
  /** total confirmed + mempool sats across the payments tree (capped scan) */
  totalSats: string
  txCount: number
}

export type BitcoinMessages = {
  "pri(bitcoin.address.getUnused)": [
    RequestBitcoinGetUnusedAddress,
    ResponseBitcoinGetUnusedAddress,
  ]
  "pri(bitcoin.utxos.get)": [RequestBitcoinGetUtxos, ResponseBitcoinGetUtxos]
  "pri(bitcoin.feeEstimates.get)": [RequestBitcoinFeeEstimates, BtcFeeEstimates]
  "pri(bitcoin.tx.submit)": [RequestBitcoinSubmit, ResponseBitcoinSubmit]
  "pri(bitcoin.tx.replace.preview)": [RequestBitcoinReplacePreview, ResponseBitcoinReplacePreview]
  "pri(bitcoin.account.preview)": [RequestBitcoinAccountPreview, ResponseBitcoinAccountPreview]
}
