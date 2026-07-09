type HexString = `0x${string}`

/** Same shape as `SignerPayloadJSON` from `@polkadot/types/types` */
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

/** Same shape as `ExtDef` from `@polkadot/types/extrinsic/signedExtensions/types` */
export type ExtDef = Record<
  string,
  { extrinsic: Record<string, string>; payload: Record<string, string> }
>
