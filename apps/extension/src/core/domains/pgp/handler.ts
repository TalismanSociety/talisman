import { getPairForAddressSafely } from "@core/handlers/helpers"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { ExtensionHandler } from "@core/libs/Handler"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { sr25519Decrypt } from "@core/util/sr25519decrypt"
import { sr25519Encrypt } from "@core/util/sr25519encrypt"
import { assert, u8aToHex, u8aToU8a } from "@polkadot/util"
import { Keypair } from "@polkadot/util-crypto/types"
import { PGPRequest, RequestPGPCancel } from "./types"
import { talismanAnalytics } from "@core/libs/Analytics"

export default class PGPHandler extends ExtensionHandler {
  private async encryptApprove({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.pgp.getEncryptRequest(id)
    assert(queued, "Unable to find request")

    const { reject, request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request
      const pw = await this.stores.password.getPassword() as string
      const pk = getPrivateKey(pair, pw)
      const kp = { publicKey: pair.publicKey, secretKey: u8aToU8a(pk) } as Keypair

      assert(u8aToU8a(payload.recipient).length === 32, "Supplied recipient pubkey is incorrect length.")
      
      assert(kp.publicKey.length === 32, "Talisman pubkey is incorrect length")
      assert(kp.secretKey.length === 64, "Talisman secretKey is incorrect length")

      // get encrypted result as integer array
      const encryptResult = sr25519Encrypt( u8aToU8a(payload.message) , u8aToU8a(payload.recipient), kp);

    talismanAnalytics.capture("encrypt message approve")

      resolve({
        id,
        result: u8aToHex(encryptResult),
      })
    })
    if (result.ok) return true
    else {
      if (result.val === "Unauthorised") reject(new Error(result.val))
      else result.unwrap() // Throws error
    }
    return
  }

  private async decryptApprove({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.pgp.getDecryptRequest(id)
    assert(queued, "Unable to find request")

    const { reject, request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request
      
      const pw = await this.stores.password.getPassword() as string
      const pk = getPrivateKey(pair, pw)

      assert(pk.length === 64, "Talisman secretKey is incorrect length")
      
      // get decrypted response as integer array
      const decryptResult = sr25519Decrypt(u8aToU8a(payload.message), {secretKey: u8aToU8a(pk)})

    talismanAnalytics.capture("decrypt message approve")

      resolve({
        id,
        result: u8aToHex(decryptResult),
      })
    })
    if (result.ok) return true
    else {
      if (result.val === "Unauthorised") reject(new Error(result.val))
      else result.unwrap() // Throws error
    }
    return
  }

  private pgpCancel({ id }: RequestPGPCancel): boolean {
    const queued = this.state.requestStores.pgp.getRequest(id)

    assert(queued, "Unable to find request")

    talismanAnalytics.capture("encrypt/decrypt message reject")

    queued.reject(new Error("Cancelled"))

    return true
  }

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

      case "pri(pgp.approveDecrypt)":
        return await this.decryptApprove(request as RequestIdOnly)

      case "pri(pgp.cancel)":
        return await this.pgpCancel(request as RequestPGPCancel)
  
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }

  }
}
