import type {
  EthResponseSign,
  EthSignAndSendRequest,
  RequestID,
  SigningRequests,
} from "@core/domains/signing/types"
import { genericSubscription } from "@core/handlers/subscriptions"
import { MessageTypesWithSubscriptions } from "@core/types"
import type {
  RequestTypes as MessageRequestTypes,
  ResponseTypes as MessageResponseTypes,
  MessageTypes,
  ResponseType,
} from "@core/types"
import type { Port } from "@core/types/base"
import { assert } from "@polkadot/util"
import { ReplaySubject } from "rxjs"
import { v4 } from "uuid"

import { isRequestOfType } from "./utils"

export type RequestTypes = keyof SigningRequests
type KnownRequest<T extends RequestTypes> = SigningRequests[T][0]
type KnownResponse<T extends RequestTypes> = SigningRequests[T][1]

export type ValidRequests = KnownRequest<RequestTypes>
type ValidResponses = KnownResponse<RequestTypes>

export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}
export type KnownRespondableRequest<T extends RequestTypes> = KnownRequest<T> &
  Resolver<KnownResponse<T>>

export type AnyRespondableRequest = {
  [K in RequestTypes]: KnownRespondableRequest<K>
}[RequestTypes]

type NewRequestCallbackFn = (request?: ValidRequests) => void
type CompletedRequestCallbackFn = (request: ValidRequests, response?: ValidResponses) => void

export abstract class RequestStore {
  // `requests` is the primary list of items that need responding to by the user
  protected readonly requests: Record<string, AnyRespondableRequest> = {}
  // `observable` is kept up to date with the list of requests, and ensures that the front end
  // can easily set up a subscription to the data, and the state can show the correct message on the icon
  readonly observable = new ReplaySubject<ValidRequests[]>(1)

  #onNewRequestCallback?: NewRequestCallbackFn
  onRequestCompletedCallback?: CompletedRequestCallbackFn
  /**
   * @param onNewRequestCallback - callback to be run when a new request is added to the queue
   */
  constructor(
    onNewRequestCallback: NewRequestCallbackFn,
    onRequestCompletedCallback?: CompletedRequestCallbackFn
  ) {
    this.#onNewRequestCallback = onNewRequestCallback
    this.onRequestCompletedCallback = onRequestCompletedCallback
  }

  allRequests<T extends RequestTypes>(type?: T) {
    if (!type) return Object.values(this.requests)

    // get only values with the matching type
    const requestValues = Object.entries(this.requests)
      .filter(([key, value]) => (key.split(".")[0] as string & RequestTypes) === type)
      .map(([key, value]) => value)

    return requestValues
  }

  public clearRequests() {
    Object.keys(this.requests).forEach((key) => delete this.requests[key])
    this.observable.next(this.getAllRequests())
  }

  protected createRequest<TRequest extends Omit<ValidRequests, "id">>(
    requestOptions: TRequest
  ): Promise<KnownResponse<TRequest["type"]>> {
    const id = `${requestOptions.type}.${v4()}` as RequestID<TRequest["type"]>

    return new Promise((resolve, reject): void => {
      const newRequest = {
        ...requestOptions,
        id,
      } as KnownRequest<TRequest["type"]>

      const completion = this.onCompleteRequest(id, resolve, reject)

      const completeRequest = {
        ...newRequest,
        ...completion,
      } as AnyRespondableRequest

      this.requests[id] = completeRequest

      this.observable.next(this.getAllRequests())
      this.#onNewRequestCallback && this.#onNewRequestCallback(newRequest)
    })
  }

  public subscribe<TMessageType extends MessageTypesWithSubscriptions>(id: string, port: Port) {
    return genericSubscription<TMessageType>(id, port, this.observable)
  }

  private onCompleteRequest<T extends RequestTypes>(
    id: RequestID<T>,
    resolve: Resolver<KnownResponse<T>>["resolve"],
    reject: (error: Error) => void
  ): Resolver<KnownResponse<T>> {
    const complete = (response?: KnownResponse<T>): void => {
      const request = this.requests[id]
      delete this.requests[id]
      this.observable.next(this.getAllRequests())
      this.onRequestCompletedCallback && this.onRequestCompletedCallback(request, response)
    }

    return {
      reject: (error: Error): void => {
        complete()
        reject(error)
      },
      resolve: (result: KnownResponse<T>): void => {
        complete(result)
        resolve(result)
      },
    }
  }

  public getRequestCount(): number {
    return Object.keys(this.requests).length
  }

  public getRequestWithType<T extends RequestTypes>(requestId: string, type: T) {
    const id = `${type}.${requestId}`
    const request = this.requests[id]

    if (isRequestOfType(request, type)) return request as KnownRespondableRequest<T>
    else return
  }

  public getRequest<T extends RequestTypes>(id: RequestID<T>) {
    const request = this.requests[id]
    const requestType = id.split(".")[0] as T
    if (isRequestOfType(request, requestType)) return request as KnownRespondableRequest<T>
    return
  }

  public getAllRequests(requestType?: RequestTypes) {
    return this.allRequests(requestType).map(this.extractBaseRequest)
  }

  protected extractBaseRequest(request: AnyRespondableRequest) {
    const { reject, resolve, ...data } = request
    return data as ValidRequests
  }
}
