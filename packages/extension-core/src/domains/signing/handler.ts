import { TypeRegistry } from "@polkadot/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { addTrailingSlash, encodeAnyAddress } from "@talismn/util"
import { TEST } from "extension-shared"

import { getPairForAddressSafely } from "../../handlers/helpers"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { isJsonPayload } from "../../util/isJsonPayload"
import { validateHexString } from "../../util/validateHexString"
import { AccountType } from "../accounts/types"
import { getHostName } from "../app/helpers"
import { watchSubstrateTransaction } from "../transactions"
import type {
  KnownSigningRequestApprove,
  KnownSigningRequestIdOnly,
  RequestSigningApproveSignature,
  SignerPayloadJSON,
} from "./types"

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({
    id,
    payload: modifiedPayload,
  }: KnownSigningRequestApprove<"substrate-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve, url } = queued

    const address = encodeAnyAddress(queued.account.address)

    const result = await getPairForAddressSafely(address, async (pair) => {
      const { payload: originalPayload } = request
      const payload = modifiedPayload || originalPayload
      const { ok, val: hostName } = getHostName(url)
      const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
        dapp: url,
        hostName: ok ? hostName : undefined,
      }

      let registry = new TypeRegistry()

      if (isJsonPayload(payload)) {
        const { signedExtensions, specVersion, blockHash } = payload
        const genesisHash = validateHexString(payload.genesisHash)

        const { registry: fullRegistry } = await getTypeRegistry(
          genesisHash,
          specVersion,
          blockHash,
          signedExtensions
        )

        registry = fullRegistry

        const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
        analyticsProperties.chain = chain?.chainName ?? genesisHash
      }

      let signature: HexString | undefined = undefined
      let signedTransaction: HexString | Uint8Array | undefined = undefined

      // notify user about transaction progress
      if (isJsonPayload(payload)) {
        // create signable extrinsic payload
        const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
          version: payload.version,
        })
        signature = extrinsicPayload.sign(pair).signature

        const chains = Object.values(await chaindataProvider.chainsById())
        const chain = chains.find((c) => c.genesisHash === payload.genesisHash)

        if (payload.withSignedTransaction) {
          const tx = registry.createType(
            "Extrinsic",
            { method: payload.method },
            { version: payload.version }
          )

          // apply signature to the modified payload
          tx.addSignature(payload.address, signature, payload)

          signedTransaction = tx.toHex()
        }

        if (chain) {
          await watchSubstrateTransaction(chain, registry, payload, signature, {
            siteUrl: queued.url,
            notifications: true,
          })
        } else if (!TEST) {
          // eslint-disable-next-line no-console
          console.warn(
            "Unable to find chain for genesis hash, transaction will not be watched",
            payload.genesisHash
          )
        }
      } else {
        signature = request.sign(registry, pair).signature
      }

      talismanAnalytics.captureDelayed("sign transaction approve", {
        ...analyticsProperties,
        networkType: "substrate",
      })

      resolve({
        id,
        signature,
        signedTransaction,
      })
    })
    if (!result.ok) {
      if (result.val === "Unauthorised") reject(new Error(result.val))
      else if (typeof result.val === "string") throw new Error(result.val)
      else throw result.val
    }
    return true
  }

  private async signingApproveExternal({
    id,
    signature,
    payload: modifiedPayload,
  }: RequestSigningApproveSignature): Promise<boolean> {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const {
      request,
      url,
      account: { address: accountAddress },
    } = queued
    const { payload: originalPayload } = request
    const payload = modifiedPayload || originalPayload

    const { ok, val: hostName } = getHostName(url)
    const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
      dapp: url,
      hostName: ok ? hostName : undefined,
    }
    const account = keyring.getAccount(accountAddress)
    let signedTransaction: HexString | Uint8Array | undefined = undefined

    if (isJsonPayload(payload)) {
      const genesisHash = validateHexString(payload.genesisHash)
      const chain = await chaindataProvider.chainByGenesisHash(genesisHash)
      analyticsProperties.chain = chain?.chainName ?? undefined

      if (chain) {
        const { signedExtensions, specVersion, blockHash } = payload
        const genesisHash = validateHexString(payload.genesisHash)
        const { registry } = await getTypeRegistry(
          genesisHash,
          specVersion,
          blockHash,
          signedExtensions
        )

        if (payload.withSignedTransaction) {
          const tx = registry.createType(
            "Extrinsic",
            { method: payload.method },
            { version: payload.version }
          )

          // apply signature to the modified payload
          tx.addSignature(payload.address, signature, payload)

          signedTransaction = tx.toHex()
        }

        await watchSubstrateTransaction(chain, registry, payload, signature, {
          siteUrl: url,
          notifications: true,
        })
      } else if (!TEST) {
        // eslint-disable-next-line no-console
        console.warn(
          "Unable to find chain for genesis hash, transaction will not be watched",
          payload.genesisHash
        )
      }
    }

    queued.resolve({ id, signature, signedTransaction })

    const hardwareType: "ledger" | "qr" | undefined = account?.meta.hardwareType
      ? account.meta.hardwareType
      : account?.meta.origin === AccountType.Qr
      ? "qr"
      : undefined

    talismanAnalytics.captureDelayed("sign transaction approve", {
      ...analyticsProperties,
      networkType: "substrate",
      hardwareType,
    })

    return true
  }

  private async signingCancel({ id }: KnownSigningRequestIdOnly<"substrate-sign">) {
    /*
     * This method used for both Eth and Polkadot requests
     */
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    talismanAnalytics.captureDelayed("sign reject", {
      networkType: "substrate",
    })
    queued.reject(new Error("Cancelled"))

    return true
  }

  private async signingApproveSignet({ id }: RequestType<"pri(signing.approveSign.signet)">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")
    assert(typeof queued.account.signetUrl === "string", "Invalid Signet account")

    const { request, url } = queued

    const params = new URLSearchParams({
      id: queued.id,
      calldata: (request.payload as SignerPayloadJSON).method,
      account: queued.account.address,
      genesisHash: queued.account.genesisHash || "",
      dapp: url,
    })

    // close popup so Signet signing page can be open in full screen normal browser
    // users will most likely stay on Signet anyway to review the pending tx
    // so the popup is not needed here and can be closed
    windowManager.popupClose()
    await chrome.tabs.create({
      url: `${addTrailingSlash(queued.account.signetUrl)}sign?${params.toString()}`,
      active: true,
    })

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pri(signing.approveSign)":
        return await this.signingApprove(request as RequestType<"pri(signing.approveSign)">)

      case "pri(signing.approveSign.hardware)":
        return await this.signingApproveExternal(request as RequestSigningApproveSignature)

      case "pri(signing.approveSign.qr)":
        return await this.signingApproveExternal(request as RequestSigningApproveSignature)

      case "pri(signing.cancel)":
        return this.signingCancel(request as RequestType<"pri(signing.cancel)">)

      case "pri(signing.approveSign.signet)":
        return this.signingApproveSignet(request as RequestType<"pri(signing.approveSign.signet)">)
      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
