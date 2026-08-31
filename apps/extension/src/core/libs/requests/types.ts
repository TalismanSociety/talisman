import type { Prettify } from "@talismn/util"

import type { EncryptRequests } from "../../domains/encrypt/types"
import type { EthRequests } from "../../domains/ethereum/types"
import type { SigningRequests } from "../../domains/signing/types"
import type { SitesAuthRequests } from "../../domains/sitesAuthorised/types"

// all types of requests can go here
export type KnownRequests = SigningRequests & SitesAuthRequests & EthRequests & EncryptRequests
/* KnownRequests types should be objects like: 
  { [name: string]: [RequestType, ResponseType] }
*/

export type KnownRequestTypes = Prettify<keyof KnownRequests>

export type KnownRequestId<T extends KnownRequestTypes> = `${T}.${string}`

export type KnownRequestIdOnly<T extends KnownRequestTypes> = {
  id: KnownRequestId<T>
}

export type KnownRequest<T extends KnownRequestTypes> = KnownRequests[T][0]
export type KnownResponse<T extends KnownRequestTypes> = KnownRequests[T][1]

export type ValidRequests = KnownRequest<KnownRequestTypes>

export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}

export type KnownRespondableRequest<T extends KnownRequestTypes> = KnownRequest<T> &
  Resolver<KnownResponse<T>>

export type AnyRespondableRequest = {
  [K in KnownRequestTypes]: KnownRespondableRequest<K>
}[KnownRequestTypes]
