import type { EncryptRequests } from "@core/domains/encrypt/types"
import type { EthRequests } from "@core/domains/ethereum/types"
import type { MetadataRequests } from "@core/domains/metadata/types"
import type { SigningRequests } from "@core/domains/signing/types"
import type { SitesAuthRequests } from "@core/domains/sitesAuthorised/types"

// all types of requests can go here
export type KnownRequests = SigningRequests &
  SitesAuthRequests &
  MetadataRequests &
  EthRequests &
  EncryptRequests
/* KnownRequests types should be objects like: 
  { [name: string]: [RequestType, ResponseType] }
*/

export type KnownRequestTypes = keyof KnownRequests

export type KnownRequestId<T extends KnownRequestTypes> = `${T}.${string}`
export type AnyRequestID = KnownRequestId<KnownRequestTypes>

export type AnyKnownRequestIdOnly = {
  id: AnyRequestID
}

export type KnownRequestIdOnly<T extends KnownRequestTypes> = {
  id: KnownRequestId<T>
}

export type KnownRequest<T extends KnownRequestTypes> = KnownRequests[T][0]
export type KnownResponse<T extends KnownRequestTypes> = KnownRequests[T][1]

export type ValidRequests = KnownRequest<KnownRequestTypes>
export type ValidResponses = KnownResponse<KnownRequestTypes>

export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}

export type KnownRespondableRequest<T extends KnownRequestTypes> = KnownRequest<T> &
  Resolver<KnownResponse<T>>

export type AnyRespondableRequest = {
  [K in KnownRequestTypes]: KnownRespondableRequest<K>
}[KnownRequestTypes]
