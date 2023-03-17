import { getPairForAddressSafely } from "@core/handlers/helpers"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { log } from "@core/log"
import type { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { sr25519Decrypt } from "@core/util/sr25519decrypt"
import { sr25519Encrypt } from "@core/util/sr25519encrypt"
import { assert, u8aToHex, u8aToU8a } from "@polkadot/util"
import { Keypair } from "@polkadot/util-crypto/types"
import * as Sentry from "@sentry/browser"

import {
  DecryptRequestIdOnly,
  ENCRYPT_DECRYPT_PREFIX,
  ENCRYPT_ENCRYPT_PREFIX,
  EncryptRequestIdOnly,
  RequestEncryptCancel,
} from "./types"

export default class EncryptHandler extends ExtensionHandler {
  private async encryptApprove({ id }: EncryptRequestIdOnly) {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request

      const pw = this.stores.password.getPassword()
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

  private async decryptApprove({ id }: DecryptRequestIdOnly) {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request

      const pw = this.stores.password.getPassword()
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
    const queued = requestStore.getRequest(id)

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
        return requestStore.subscribe(id, port, [ENCRYPT_ENCRYPT_PREFIX, ENCRYPT_DECRYPT_PREFIX])

      case "pri(encrypt.byid.subscribe)": {
        const cb = createSubscription(id, port)
        const subscription = requestStore.observable.subscribe((reqs) => {
          const req = reqs.find(
            (req) => req.id === (request as EncryptRequestIdOnly | DecryptRequestIdOnly).id
          )
          if (req && (req.type === ENCRYPT_ENCRYPT_PREFIX || req.type === ENCRYPT_DECRYPT_PREFIX))
            cb(req)
        })

        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          subscription.unsubscribe()
        })
        return true
      }

      case "pri(encrypt.approveEncrypt)":
        return await this.encryptApprove(request as EncryptRequestIdOnly)

      case "pri(encrypt.approveDecrypt)":
        return await this.decryptApprove(request as DecryptRequestIdOnly)

      case "pri(encrypt.cancel)":
        return this.encryptCancel(request as RequestEncryptCancel)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
