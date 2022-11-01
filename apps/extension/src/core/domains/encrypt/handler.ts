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
import { AnyEncryptRequest, RequestEncryptCancel } from "./types"
import { talismanAnalytics } from "@core/libs/Analytics"
import { log } from "@core/log"
import * as Sentry from "@sentry/browser"

export default class EncryptHandler extends ExtensionHandler {
  private async encryptApprove({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.encrypt.getEncryptRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request

      const pw = await this.stores.password.getPassword()
      assert(pw, "Unable to retreive password from store.")

      const pk = getPrivateKey(pair, pw)
      const kp = { publicKey: pair.publicKey, secretKey: u8aToU8a(pk) } as Keypair

      assert(kp.secretKey.length === 64, "Talisman secretKey is incorrect length")

      // get encrypted result as integer array
      const encryptResult = sr25519Encrypt(
        u8aToU8a(payload.message),
        u8aToU8a(payload.recipient),
        kp
      )

      talismanAnalytics.capture("encrypt message approve")

      resolve({
        id,
        result: u8aToHex(encryptResult),
      })
    })

    if (result.ok) return true

    log.log(result.val)
    Sentry.captureException(result.val)
    throw new Error("Unable to encrypt message.")
  }

  private async decryptApprove({ id }: RequestIdOnly) {
    const queued = this.state.requestStores.encrypt.getDecryptRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request

      const pw = await this.stores.password.getPassword()
      assert(pw, "Unable to retreive password from store.")

      const pk = getPrivateKey(pair, pw)

      assert(pk.length === 64, "Talisman secretKey is incorrect length")

      // get decrypted response as integer array
      const decryptResult = sr25519Decrypt(u8aToU8a(payload.message), { secretKey: u8aToU8a(pk) })

      talismanAnalytics.capture("decrypt message approve")

      resolve({
        id,
        result: u8aToHex(decryptResult),
      })
    })

    if (result.ok) return true

    log.log(result.val)
    Sentry.captureException(result.val)
    throw new Error("Unable to decrypt message.")
  }

  private encryptCancel({ id }: RequestEncryptCancel): boolean {
    const queued = this.state.requestStores.encrypt.getRequest(id)

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
      case "pri(encrypt.requests)":
        return this.state.requestStores.encrypt.subscribe<"pri(encrypt.requests)">(id, port)

      case "pri(encrypt.byid.subscribe)": {
        const cb = createSubscription<"pri(encrypt.byid.subscribe)">(id, port)
        const subscription = this.state.requestStores.encrypt.observable.subscribe(
          (reqs: AnyEncryptRequest[]) => {
            const req = reqs.find((req) => req.id === (request as RequestIdOnly).id)
            if (req) cb(req)
          }
        )

        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          subscription.unsubscribe()
        })
        return true
      }

      case "pri(encrypt.approveEncrypt)":
        return await this.encryptApprove(request as RequestIdOnly)

      case "pri(encrypt.approveDecrypt)":
        return await this.decryptApprove(request as RequestIdOnly)

      case "pri(encrypt.cancel)":
        return this.encryptCancel(request as RequestEncryptCancel)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
