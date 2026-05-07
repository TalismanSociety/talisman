import type { SignerPayloadJSON } from "./helpers/signedPayloadTypes"

// biome-ignore lint/suspicious/noExplicitAny: legacy
export type DecodedCall<Args = any> = { pallet: string; method: string; args: Args }

export type PayloadSignerConfig = {
  address: string
  tip?: bigint
}

export type JsonRpcRequestSend = (
  method: string,
  params: unknown[],
  isCacheable?: boolean
) => Promise<unknown>

export type SapiConnectorProps = {
  chainId: string // indicational only, used for logs
  send: JsonRpcRequestSend
  submit?: (
    payload: SignerPayloadJSON,
    signature?: `0x${string}`,
    // biome-ignore lint/suspicious/noExplicitAny: type unknown at this package level
    txInfo?: any
  ) => Promise<{ hash: `0x${string}` }>
  submitWithBittensorMevShield?: (
    payload: SignerPayloadJSON,
    // biome-ignore lint/suspicious/noExplicitAny: type unknown at this package level
    txInfo?: any
  ) => Promise<{ hash: `0x${string}`; innerHash?: `0x${string}` }>
}

export type ScaleApiSubmitMode = "default" | "bittensor-mev-shield"
