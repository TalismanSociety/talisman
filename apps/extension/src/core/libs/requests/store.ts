import { genericSubscription } from "@core/handlers/subscriptions"
import { MessageTypesWithSubscriptions } from "@core/types"
import type { Port } from "@core/types/base"
import { ReplaySubject, map } from "rxjs"
import { v4 } from "uuid"

import { windowManager } from "../WindowManager"
import type {
  AnyRespondableRequest,
  KnownRequest,
  KnownRequestTypes,
  KnownRespondableRequest,
  KnownResponse,
  RequestID,
  Resolver,
  ValidRequests,
} from "./types"
import { isRequestOfType } from "./utils"

export class RequestStore {
  // `requests` is the primary list of items that need responding to by the user
  protected readonly requests: Record<string, AnyRespondableRequest> = {}
  // `observable` is kept up to date with the list of requests, and ensures that the front end
  // can easily set up a subscription to the data, and the state can show the correct message on the icon
  readonly observable = new ReplaySubject<ValidRequests[]>(1)

  allRequests(): AnyRespondableRequest[]
  allRequests<T extends KnownRequestTypes>(type: T): KnownRespondableRequest<T>[]
  allRequests<T extends KnownRequestTypes>(
    type?: T
  ): KnownRespondableRequest<T>[] | AnyRespondableRequest[] {
    if (!type) return Object.values(this.requests)

    // get only values with the matching type
    const requestValues = Object.entries(this.requests)
      .filter(([key, value]) => key.split(".")[0] === type)
      .map(([key, value]) => value) as KnownRespondableRequest<T>[]

    return requestValues
  }

  public clearRequests() {
    Object.keys(this.requests).forEach((key) => delete this.requests[key])
    this.observable.next(this.getAllRequests())
  }

  public createRequest<
    TRequest extends Omit<ValidRequests, "id">,
    T extends KnownRequestTypes = TRequest["type"]
  >(
    // public createRequest<T extends KnownRequestTypes>(
    requestOptions: TRequest
  ): Promise<KnownResponse<T>> {
    const id = `${requestOptions.type}.${v4()}` as RequestID<T>

    return new Promise((resolve, reject): void => {
      const newRequest = {
        ...requestOptions,
        id,
      } as unknown as KnownRequest<T>

      const completeRequest = {
        ...newRequest,
        ...this.onCompleteRequest(id, resolve, reject),
      } as KnownRespondableRequest<T>

      this.requests[id] = completeRequest

      this.observable.next(this.getAllRequests())
      windowManager.popupOpen(`#/${requestOptions.type}/${id}`)
    })
  }

  public subscribe<TMessageType extends MessageTypesWithSubscriptions>(
    id: string,
    port: Port,
    types?: Array<KnownRequestTypes>
  ) {
    return genericSubscription<TMessageType>(
      id,
      port,
      this.observable.pipe(
        map((reqs) => (types ? reqs.filter((req) => types.includes(req.type)) : reqs))
      )
    )
  }

  private onCompleteRequest<T extends KnownRequestTypes>(
    id: RequestID<T>,
    resolve: Resolver<KnownResponse<T>>["resolve"],
    reject: (error: Error) => void
  ): Resolver<KnownResponse<T>> {
    const complete = (): void => {
      delete this.requests[id]
      this.observable.next(this.getAllRequests())
    }

    return {
      reject: (error: Error): void => {
        complete()
        reject(error)
      },
      resolve: (result: KnownResponse<T>): void => {
        complete()
        resolve(result)
      },
    }
  }

  public getRequestCount(): number
  public getRequestCount<T extends KnownRequestTypes>(requestTypes: T[]): number
  public getRequestCount<T extends KnownRequestTypes>(requestTypes?: T[]): number {
    const allRequests = requestTypes
      ? requestTypes.flatMap((rType) => this.allRequests(rType))
      : this.allRequests()
    return allRequests.length
  }

  public getRequest<T extends KnownRequestTypes>(id: RequestID<T>) {
    const request = this.requests[id]
    const requestType = id.split(".")[0] as T
    if (isRequestOfType(request, requestType)) return request as KnownRespondableRequest<T>
    return
  }

  public deleteRequest<T extends KnownRequestTypes>(id: RequestID<T>) {
    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    return
  }

  public getAllRequests(): ValidRequests[]
  public getAllRequests<T extends KnownRequestTypes>(requestType: T): KnownRequest<T>[]
  public getAllRequests<T extends KnownRequestTypes>(
    requestType?: T
  ): KnownRequest<T>[] | ValidRequests[] {
    return (requestType ? this.allRequests(requestType) : this.allRequests()).map(
      this.extractBaseRequest
    )
  }

  protected extractBaseRequest<T extends KnownRequestTypes>(
    request: KnownRespondableRequest<T> | AnyRespondableRequest
  ) {
    const { reject, resolve, ...data } = request
    return data as KnownRequest<T>
  }
}

export const requestStore = new RequestStore()
