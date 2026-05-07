/**
 * Local type definitions replacing @polkadot/types imports.
 * These mirror the PJS SignerPayloadJSON and ExtDef interfaces.
 */

type HexString = `0x${string}`

export interface SignerPayloadJSON {
  address: string
  assetId?: HexString
  blockHash: HexString
  blockNumber: HexString
  era: HexString
  genesisHash: HexString
  metadataHash?: HexString
  method: string
  mode?: number
  nonce: HexString
  specVersion: HexString
  tip: HexString
  transactionVersion: HexString
  signedExtensions: string[]
  version: number
  withSignedTransaction?: boolean
}

export type ExtTypes = Record<string, string>

export interface ExtInfo {
  extrinsic: ExtTypes
  payload: ExtTypes
}

export type ExtDef = Record<string, ExtInfo>
