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

/** spend status of one output, from /tx/:txid/outspends */
export type EsploraOutspend = {
  spent: boolean
  txid?: string
  vin?: number
  status?: EsploraTxStatus
}

/** subset of /tx/:txid used for descendant fee accounting */
export type EsploraTx = {
  txid: string
  fee: number
  status: EsploraTxStatus
}

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
  getTx(txid: string): Promise<EsploraTx>
  getTxOutspends(txid: string): Promise<EsploraOutspend[]>
  getFeeEstimates(): Promise<BtcFeeEstimates>
  broadcastTx(txHex: string): Promise<string>
}
