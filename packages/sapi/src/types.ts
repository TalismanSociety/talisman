import { SignerPayloadJSON } from "@polkadot/types/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCall<Args = any> = { pallet: string; method: string; args: Args }

export type PayloadSignerConfig = {
  address: string
  tip?: bigint
}

export type JsonRpcRequestSend = (
  method: string,
  params: unknown[],
  isCacheable?: boolean,
) => Promise<unknown>

export type SapiConnectorProps = {
  chainId: string // indicational only, used for logs
  send: JsonRpcRequestSend
  submit?: (
    payload: SignerPayloadJSON,
    signature?: `0x${string}`,
    txInfo?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => Promise<{ hash: `0x${string}` }>
  submitWithBittensorMevShield?: (
    payload: SignerPayloadJSON,
    txInfo?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ) => Promise<{ hash: `0x${string}` }>
}
