import { TEST } from "@common/constants"
import { map, ReplaySubject, Subject } from "rxjs"
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
    const reqCounts = requests.reduce(
      (counts, request) => {
        if (!counts[request.type]) counts[request.type] = 0
        counts[request.type] += 1
        return counts
      },
      {} as Record<KnownRequestTypes, number>
    )

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

export type RequestEnding =
  | "resolved"
  | "rejected"
  | "window_closed"
  | "port_disconnected"
  | "open_failed"
  | "ignored"

export type RequestFact =
  | { type: "created"; request: ValidRequests; at: number }
  | { type: "ended"; request: ValidRequests; ending: RequestEnding; error?: Error; at: number }

class RequestStore {
  // `requests` is the primary list of items that need responding to by the user
  protected readonly requests: Record<
    string,
    { request: AnyRespondableRequest; windowId?: number } // windowId should always be set, except during ci tests
  > = {}
  // `observable` is kept up to date with the list of requests, and ensures that the front end
  // can easily set up a subscription to the data, and the state can show the correct message on the icon
  readonly observable = new ReplaySubject<ValidRequests[]>(1)
  /** Each request is created once and ends once, whichever exit runs first. */
  readonly facts$ = new Subject<RequestFact>()

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
      this.#end(key, "window_closed")
    })
  }

  #end(id: string, ending: RequestEnding, error?: Error): boolean {
    const entry = this.requests[id]
    if (!entry) return false

    delete this.requests[id]
    this.observable.next(this.getAllRequests())
    this.facts$.next({
      type: "ended",
      request: this.extractBaseRequest(entry.request),
      ending,
      ...(error && { error }),
      at: Date.now(),
    })
    return true
  }

  public createRequest<
    TRequest extends Omit<ValidRequests, "id">,
    T extends KnownRequestTypes = TRequest["type"],
  >(requestOptions: TRequest, port?: Port): Promise<KnownResponse<T>> {
    const id = `${requestOptions.type}.${v4()}` as KnownRequestId<T>

    return new Promise((resolve, reject): void => {
      // reject pending request if user closes the tab that requested it
      if (port?.onDisconnect)
        port.onDisconnect.addListener(() => {
          if (this.#end(id, "port_disconnected")) reject(new Error("Port disconnected"))
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
      this.facts$.next({ type: "created", request: newRequest, at: Date.now() })

      const openFailed = (error: Error) => {
        this.#end(id, "open_failed")
        reject(error)
      }

      windowManager
        .popupOpen(`#/${requestOptions.type}/${id}`, () => {
          if (this.#end(id, "window_closed")) reject(new Error("Cancelled"))
        })
        .then((windowId) => {
          if (windowId === undefined && !TEST) openFailed(new Error("Failed to open popup"))
          else if (this.requests[id]) {
            this.requests[id].windowId = windowId
            this.observable.next(this.getAllRequests())
          }
        })
        .catch(openFailed)
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
    const complete = (ending: RequestEnding, error?: Error): void => {
      if (this.requests[id]) windowManager.popupClose(this.requests[id].windowId)
      this.#end(id, ending, error)
    }

    return {
      reject: (error: Error): void => {
        complete("rejected", error)
        reject(error)
      },
      resolve: (result: KnownResponse<T>): void => {
        complete("resolved")
        resolve(result)
      },
    }
  }

  public getCounts() {
    return new RequestCounts(this.allRequests())
  }

  public getRequest<T extends KnownRequestTypes>(id: KnownRequestId<T>) {
    const request = this.requests[id]?.request
    const requestType = id.split(".")[0] as T
    if (request && isRequestOfType(request, requestType))
      return request as KnownRespondableRequest<T>
    return
  }

  public deleteRequest<T extends KnownRequestTypes>(id: KnownRequestId<T>) {
    if (this.requests[id]) windowManager.popupClose(this.requests[id].windowId)
    this.#end(id, "ignored")
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
