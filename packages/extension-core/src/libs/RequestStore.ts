import { ReplaySubject } from "rxjs"
import { v4 } from "uuid"

import { genericSubscription } from "../handlers/subscriptions"
import { MessageTypesWithSubscriptions } from "../types"
import type { Port, Resolver } from "../types/base"

export type TRespondableRequest<TRequest, TResponse> = Resolver<TResponse> &
  TRequest & {
    id: string
  }

type NewRequestCallbackFn<TRequest> = (request: TRequest) => void
type CompletedRequestCallbackFn<TRequest, TResponse> = (
  request: TRequest,
  response?: TResponse
) => void | Promise<void>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class RequestStore<TRequest extends { id: string; [key: string]: any }, TResponse> {
  // `requests` is the primary list of items that need responding to by the user
  protected readonly requests: Record<string, TRespondableRequest<TRequest, TResponse>> = {}
  // `observable` is kept up to date with the list of requests, and ensures that the front end
  // can easily set up a subscription to the data, and the state can show the correct message on the icon
  readonly observable = new ReplaySubject<TRequest[]>(1)

  #onNewRequestCallback?: NewRequestCallbackFn<TRequest>
  onRequestCompletedCallback?: CompletedRequestCallbackFn<TRequest, TResponse>
  /**
   * @param onNewRequestCallback - callback to be run when a new request is added to the queue
   */
  constructor(
    onNewRequestCallback: NewRequestCallbackFn<TRequest>,
    onRequestCompletedCallback?: CompletedRequestCallbackFn<TRequest, TResponse>
  ) {
    this.#onNewRequestCallback = onNewRequestCallback
    this.onRequestCompletedCallback = onRequestCompletedCallback
  }

  public get allRequests(): TRespondableRequest<TRequest, TResponse>[] {
    return Object.values(this.requests)
  }

  public clearRequests() {
    Object.keys(this.requests).forEach((key) => delete this.requests[key])
    this.observable.next(this.getAllRequests())
  }

  protected createRequest(requestOptions: Omit<TRequest, "id"> | TRequest): Promise<TResponse> {
    const id = requestOptions.id ?? v4()
    return new Promise((resolve, reject): void => {
      const newRequest = {
        ...requestOptions,
        id,
      } as TRequest

      this.requests[id] = {
        ...newRequest,
        ...this.onCompleteRequest(id, resolve, reject),
      } as TRespondableRequest<TRequest, TResponse>

      this.observable.next(this.getAllRequests())
      this.#onNewRequestCallback && this.#onNewRequestCallback(newRequest)
    })
  }

  public subscribe<TMessageType extends MessageTypesWithSubscriptions>(id: string, port: Port) {
    return genericSubscription<TMessageType>(id, port, this.observable)
  }

  private onCompleteRequest = (
    id: string,
    resolve: (result: TResponse) => void,
    reject: (error: Error) => void
  ): Resolver<TResponse> => {
    const complete = async (response?: TResponse) => {
      const request = this.requests[id]
      delete this.requests[id]
      this.observable.next(this.getAllRequests())
      if (this.onRequestCompletedCallback) await this.onRequestCompletedCallback(request, response)
    }

    return {
      reject: async (error: Error) => {
        await complete()
        reject(error)
      },
      resolve: async (result: TResponse) => {
        await complete(result)
        resolve(result)
      },
    }
  }

  public getRequestCount(): number {
    return Object.keys(this.requests).length
  }

  public getRequest(id: string): TRespondableRequest<TRequest, TResponse> {
    return this.requests[id]
  }

  public getAllRequests(): TRequest[] {
    return this.allRequests.map(this.mapRequestToData)
  }

  protected mapRequestToData(request: TRespondableRequest<TRequest, TResponse>): TRequest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reject, resolve, ...data } = request
    return data as TRequest
  }
}
