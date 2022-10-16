import { getPairForAddressSafely } from "@core/handlers/helpers"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { assert } from "@polkadot/util"
import { PGPRequest } from "./types"

export default class PGPHandler extends ExtensionHandler {
  private async encryptApprove({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.pgp.getPGPRequest(id)
    assert(queued, "Unable to find request")

    const { reject, request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request

      const encryptResult = await pair.encryptMessage(payload.message, payload.recipient)

      resolve({
        id,
        result: encryptResult,
      })
    })
    if (result.ok) return true
    else {
      if (result.val === "Unauthorised") reject(new Error(result.val))
      else result.unwrap() // Throws error
    }
    return
  }

  //TODO-pgp: reject request

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(pgp.requests)":
        return this.state.requestStores.pgp.subscribe<"pri(pgp.requests)">(id, port)

      case "pri(pgp.byid.subscribe)": {
        const cb = createSubscription<"pri(pgp.byid.subscribe)">(id, port)
        const subscription = this.state.requestStores.pgp.observable.subscribe(
          (reqs: PGPRequest[]) => {
            const pgpRequest = reqs.find((req) => req.id === (request as RequestIdOnly).id)
            if (pgpRequest) cb(pgpRequest)
          }
        )

        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          subscription.unsubscribe()
        })
        return true
      }

      case "pri(pgp.approveEncrypt)":
        return await this.encryptApprove(request as RequestIdOnly)
  
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }

  }
}
