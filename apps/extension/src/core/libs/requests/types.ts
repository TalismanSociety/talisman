import type { SigningRequests } from "@core/domains/signing/types"

export type KnownRequests = SigningRequests // all types of requests can go here

export type KnownRequestTypes = keyof KnownRequests

export type RequestID<T extends KnownRequestTypes> = `${T}.${string}`
export type AnyRequestID = RequestID<KnownRequestTypes>

export type AnyKnownRequestIdOnly = {
  id: AnyRequestID
}

export type KnownRequestIdOnly<T extends KnownRequestTypes> = {
  id: RequestID<T>
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
