import { assert, u8aToHex, u8aToU8a } from "@polkadot/util"
import { Keypair } from "@polkadot/util-crypto/types"
import { getPublicKeyFromSecret } from "@talismn/crypto"
import { log } from "extension-shared"

import type { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { sentry } from "../../config/sentry"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { Port } from "../../types/base"
import { sr25519Decrypt } from "../../util/sr25519decrypt"
import { sr25519Encrypt } from "../../util/sr25519encrypt"
import { withSecretKey } from "../keyring/withSecretKey"
import { DecryptRequestIdOnly, EncryptRequestIdOnly, RequestEncryptCancel } from "./types"

export default class EncryptHandler extends ExtensionHandler {
  private async encryptApprove({ id }: EncryptRequestIdOnly) {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await withSecretKey(queued.account.address, async (secretKey, curve) => {
      const { payload } = request

      const kp: Keypair = { publicKey: getPublicKeyFromSecret(secretKey, curve), secretKey }

      assert(kp.secretKey.length === 64, "Talisman secretKey is incorrect length")

      // get encrypted result as integer array
      const encryptResult = sr25519Encrypt(
        u8aToU8a(payload.message),
        u8aToU8a(payload.recipient),
        kp,
      )

      talismanAnalytics.capture("encrypt message approve")

      resolve({
        id,
        result: u8aToHex(encryptResult),
      })
    })

    if (result.ok) return true

    log.log(result.val)
    sentry.captureException(result.val)
    throw new Error("Unable to encrypt message.")
  }

  private async decryptApprove({ id }: DecryptRequestIdOnly) {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { request, resolve } = queued

    const result = await withSecretKey(queued.account.address, async (secretKey, curve) => {
      const { payload } = request

      assert(curve === "sr25519", "Unsupported curve")
      assert(secretKey.length === 64, "Talisman secretKey is incorrect length")

      // get decrypted response as integer array
      const decryptResult = sr25519Decrypt(u8aToU8a(payload.message), { secretKey })

      talismanAnalytics.capture("decrypt message approve")

      resolve({
        id,
        result: u8aToHex(decryptResult),
      })
    })

    if (result.ok) return true

    log.log(result.val)
    sentry.captureException(result.val)
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
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
