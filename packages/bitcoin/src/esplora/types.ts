type EsploraAddressStatsSide = {
  funded_txo_count: number
  funded_txo_sum: number
  spent_txo_count: number
  spent_txo_sum: number
  tx_count: number
}

export type EsploraAddressStats = {
  address: string
  chain_stats: EsploraAddressStatsSide
  mempool_stats: EsploraAddressStatsSide
}

export type EsploraUtxoStatus = {
  confirmed: boolean
  block_height?: number
  block_hash?: string
  block_time?: number
}

export type EsploraUtxo = {
  txid: string
  vout: number
  value: number
  status: EsploraUtxoStatus
}

export type EsploraTxStatus = EsploraUtxoStatus

/** normalized fee estimates, sat/vB */
export type BtcFeeEstimates = {
  fastest: number
  halfHour: number
  hour: number
  economy: number
  minimum: number
}

export interface BtcApi {
  getTipHeight(): Promise<number>
  getAddressStats(address: string): Promise<EsploraAddressStats>
  getAddressUtxos(address: string): Promise<EsploraUtxo[]>
  getTxStatus(txid: string): Promise<EsploraTxStatus>
  getTxHex(txid: string): Promise<string>
  getFeeEstimates(): Promise<BtcFeeEstimates>
  broadcastTx(txHex: string): Promise<string>
}
