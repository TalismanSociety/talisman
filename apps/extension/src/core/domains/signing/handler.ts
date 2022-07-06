import { getUnlockedPairFromAddress } from "@core/handlers/helpers"
import { createSubscription, genericSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import { watchSubstrateTransaction } from "@core/notifications"
import type {
  AnySigningRequest,
  MessageTypes,
  RequestSigningCancel,
  RequestTypes,
  ResponseType,
} from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { getRuntimeVersion } from "@core/util/getRuntimeVersion"
import { getTransactionDetails } from "@core/util/getTransactionDetails"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import isJsonPayload from "@core/util/isJsonPayload"
import { RequestSigningApproveSignature } from "@polkadot/extension-base/background/types"
import { TypeRegistry } from "@polkadot/types"
import { assert } from "@polkadot/util"

// a global registry to use internally
const registry = new TypeRegistry()

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.signing.getPolkadotRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve } = queued
    try {
      // eslint-disable-next-line no-var
      var pair = getUnlockedPairFromAddress(queued.account.address)
    } catch (error) {
      this.stores.password.clearPassword()
      reject(
        error instanceof Error ? error : new Error(typeof error === "string" ? error : undefined)
      )
      return false
    }

    const { payload } = request
    const analyticsProperties: { dapp: string; chain?: string } = { dapp: queued.url }
    if (isJsonPayload(payload)) {
      // Get the metadata for the genesisHash
      const currentMetadata = await db.metadata.get(payload.genesisHash)

      // set the registry before calling the sign function
      registry.setSignedExtensions(payload.signedExtensions, currentMetadata?.userExtensions)

      if (currentMetadata) {
        registry.register(currentMetadata?.types)
        analyticsProperties.chain = currentMetadata.chain
      }
    }

    const result = request.sign(registry, pair)

    // notify user about transaction progress
    if (isJsonPayload(payload) && (await this.stores.settings.get("allowNotifications"))) {
      const chains = await db.chains.toArray()
      const chain = chains.find((c) => c.genesisHash === payload.genesisHash)
      if (chain) {
        // it's hard to get a reliable hash, we'll use signature to identify the on chain extrinsic
        // our signature : 0x016c175dd8818d0317d3048f9e3ff4c8a0d58888fb00663c5abdb0b4b7d0082e3cf3aef82e893f5ac9490ed7492fda20010485f205dbba6006a0ba033409198987
        // on chain signature : 0x6c175dd8818d0317d3048f9e3ff4c8a0d58888fb00663c5abdb0b4b7d0082e3cf3aef82e893f5ac9490ed7492fda20010485f205dbba6006a0ba033409198987
        // => remove the 01 prefix
        const signature = `0x${result.signature.slice(4)}`
        watchSubstrateTransaction(chain, signature)
      }
    }

    talismanAnalytics.capture("sign transaction approve", {
      ...analyticsProperties,
      type: "signature",
    })

    resolve({
      id,
      ...result,
    })

    return true
  }

  private signingApproveHardware({ id, signature }: RequestSigningApproveSignature): boolean {
    const queued = this.state.requestStores.signing.getPolkadotRequest(id)

    assert(queued, "Unable to find request")

    const { resolve } = queued

    resolve({ id, signature })
    talismanAnalytics.capture("sign transaction approve", { type: "hardware" })

    return true
  }

  private signingCancel({ id }: RequestSigningCancel): boolean {
    /*
     * This method used for both Eth and Polkadot requests
     */
    const queued = this.state.requestStores.signing.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued
    talismanAnalytics.capture("sign transaction reject")
    reject(new Error("Cancelled"))

    return true
  }

  private async decode({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.signing.getPolkadotRequest(id)
    assert(queued, "Unable to find request")
    if (!isJsonPayload(queued.request.payload)) return null

    const { address, nonce, blockHash, genesisHash, signedExtensions } = queued.request.payload

    const chains = await db.chains.toArray()
    const chain = chains.find((c) => c.genesisHash === genesisHash)
    assert(chain, "Unable to find chain")

    const [runtimeVersion, registry] = await Promise.all([
      getRuntimeVersion(chain.id, blockHash),
      getTypeRegistry(chain.id, blockHash),
    ])
    registry.setSignedExtensions(signedExtensions)

    // convert to extrinsic
    const extrinsic = registry.createType("Extrinsic", queued.request.payload) // payload as UnsignedTransaction

    // fake sign it so fees can be queried
    extrinsic.signFake(address, { nonce, blockHash, genesisHash, runtimeVersion })

    // analyse the call to extract args and docs
    return await getTransactionDetails(chain.id, extrinsic)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(signing.requests)":
        return this.state.requestStores.signing.subscribe<"pri(signing.requests)">(id, port)

      case "pri(app.authStatus.subscribe)":
        return genericSubscription<"pri(app.authStatus.subscribe)">(
          id,
          port,
          this.stores.password.isLoggedIn
        )

      case "pri(signing.byid.subscribe)": {
        const cb = createSubscription<"pri(signing.byid.subscribe)">(id, port)
        const subscription = this.state.requestStores.signing.observable.subscribe(
          (reqs: AnySigningRequest[]) => {
            const signRequest = reqs.find((req) => req.id === (request as RequestIdOnly).id)
            if (signRequest) cb(signRequest)
          }
        )

        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          subscription.unsubscribe()
        })
        return true
      }

      case "pri(signing.approveSign)":
        return await this.signingApprove(request as RequestIdOnly)

      case "pri(signing.approveSign.hardware)":
        return await this.signingApproveHardware(request as RequestSigningApproveSignature)

      case "pri(signing.cancel)":
        return this.signingCancel(request as RequestSigningCancel)

      case "pri(signing.decode)":
        return this.decode(request as RequestIdOnly)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
