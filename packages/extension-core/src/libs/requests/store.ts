import { TEST } from "extension-shared"
import { ReplaySubject, map } from "rxjs"
import { v4 } from "uuid"

import { genericSubscription } from "../../handlers/subscriptions"
import type { Port } from "../../types/base"
import { windowManager } from "../WindowManager"
import type {
  AnyRespondableRequest,
  KnownRequest,
  KnownRequestId,
  KnownRequestTypes,
  KnownRespondableRequest,
  KnownResponse,
  Resolver,
  ValidRequests,
} from "./types"
import { isRequestOfType } from "./utils"

class RequestCounts {
  #counts: Record<KnownRequestTypes, number>

  constructor(requests: AnyRespondableRequest[]) {
    const reqCounts = requests.reduce((counts, request) => {
      if (!counts[request.type]) counts[request.type] = 0
      counts[request.type] += 1
      return counts
    }, {} as Record<KnownRequestTypes, number>)

    this.#counts = reqCounts
  }
  public get(type: KnownRequestTypes) {
    if (type in this.#counts) return this.#counts[type]
    else return 0
  }

  public all() {
    return Object.values(this.#counts).reduce((sum, each) => sum + each, 0)
  }
}

export class RequestStore {
  // `requests` is the primary list of items that need responding to by the user
  protected readonly requests: Record<
    string,
    { request: AnyRespondableRequest; windowId?: number } // windowId should always be set, except during ci tests
  > = {}
  // `observable` is kept up to date with the list of requests, and ensures that the front end
  // can easily set up a subscription to the data, and the state can show the correct message on the icon
  readonly observable = new ReplaySubject<ValidRequests[]>(1)

  allRequests(): AnyRespondableRequest[]
  allRequests<T extends KnownRequestTypes>(type: T): KnownRespondableRequest<T>[]
  allRequests<T extends KnownRequestTypes>(
    type?: T
  ): KnownRespondableRequest<T>[] | AnyRespondableRequest[] {
    if (!type) return Object.values(this.requests).map((req) => req.request)

    // get only values with the matching type
    const requestValues = Object.entries(this.requests)
      .filter(([key]) => key.split(".")[0] === type)
      .map(([, value]) => value.request) as KnownRespondableRequest<T>[]

    return requestValues
  }

  public clearRequests() {
    Object.keys(this.requests).forEach((key) => {
      windowManager.popupClose(this.requests[key].windowId)
      delete this.requests[key]
    })
    this.observable.next(this.getAllRequests())
  }

  public createRequest<
    TRequest extends Omit<ValidRequests, "id">,
    T extends KnownRequestTypes = TRequest["type"]
  >(requestOptions: TRequest, port?: Port): Promise<KnownResponse<T>> {
    const id = `${requestOptions.type}.${v4()}` as KnownRequestId<T>

    return new Promise((resolve, reject): void => {
      // reject pending request if user closes the tab that requested it
      if (port?.onDisconnect)
        port.onDisconnect.addListener(() => {
          if (!this.requests[id]) return

          delete this.requests[id]
          this.observable.next(this.getAllRequests())

          reject(new Error("Port disconnected"))
        })

      const newRequest = {
        ...requestOptions,
        id,
      } as unknown as KnownRequest<T>

      const request = {
        ...newRequest,
        ...this.onCompleteRequest(id, resolve, reject),
      } as KnownRespondableRequest<T>

      this.requests[id] = { request }

      windowManager
        .popupOpen(`#/${requestOptions.type}/${id}`, () => {
          if (!this.requests[id]) return

          delete this.requests[id]
          this.observable.next(this.getAllRequests())

          reject(new Error("Cancelled"))
        })
        .then((windowId) => {
          if (windowId === undefined && !TEST) reject(new Error("Failed to open popup"))
          else {
            this.requests[id].windowId = windowId
            this.observable.next(this.getAllRequests())
          }
        })
        .catch(reject)
    })
  }

  public subscribe(id: string, port: Port, types?: Array<KnownRequestTypes>) {
    return genericSubscription(
      id,
      port,
      this.observable.pipe(
        map((reqs) => (types ? reqs.filter((req) => types.includes(req.type)) : reqs))
      )
    )
  }

  private onCompleteRequest<T extends KnownRequestTypes>(
    id: KnownRequestId<T>,
    resolve: Resolver<KnownResponse<T>>["resolve"],
    reject: (error: Error) => void
  ): Resolver<KnownResponse<T>> {
    const complete = (): void => {
      if (this.requests[id]) windowManager.popupClose(this.requests[id].windowId)
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

  public getCounts() {
    return new RequestCounts(this.allRequests())
  }

  public getRequest<T extends KnownRequestTypes>(id: KnownRequestId<T>) {
    const { request } = this.requests[id]
    const requestType = id.split(".")[0] as T
    if (isRequestOfType(request, requestType)) return request as KnownRespondableRequest<T>
    return
  }

  public deleteRequest<T extends KnownRequestTypes>(id: KnownRequestId<T>) {
    if (this.requests[id]) windowManager.popupClose(this.requests[id].windowId)
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reject, resolve, ...data } = request
    return data as KnownRequest<T>
  }
}

export const requestStore = new RequestStore()
