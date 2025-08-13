import { TypeRegistry } from "@polkadot/types"
import { sign as signExtrinsic } from "@polkadot/types/extrinsic/util"
import { assert, u8aToHex } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { encodeAnyAddress } from "@talismn/crypto"
import { addTrailingSlash } from "@talismn/util"
import { TEST } from "extension-shared"

import type { MessageTypes, RequestType, ResponseType } from "../../types"
import type {
  KnownSigningRequestApprove,
  KnownSigningRequestIdOnly,
  RequestSigningApproveSignature,
  SignerPayloadJSON,
} from "./types"
import { sentry } from "../../config/sentry"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import { chaindataProvider } from "../../rpcs/chaindata"
import { Port } from "../../types/base"
import { getTypeRegistry } from "../../util/getTypeRegistry"
import { isJsonPayload } from "../../util/isJsonPayload"
import { validateHexString } from "../../util/validateHexString"
import { getHostName } from "../app/helpers"
import { withPjsKeyringPair } from "../keyring/withPjsKeyringPair"
import { watchSubstrateTransaction } from "../transactions"

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({
    id,
    payload: modifiedPayload,
  }: KnownSigningRequestApprove<"substrate-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve, url } = queued

    const address = encodeAnyAddress(queued.account.address)

    const result = await withPjsKeyringPair(address, async (pair) => {
      const { payload: originalPayload } = request
      const payload = modifiedPayload || originalPayload
      const { ok, val: hostName } = getHostName(url)
      const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
        dapp: url,
        hostName: ok ? hostName : undefined,
      }

      let registry = new TypeRegistry()

      if (isJsonPayload(payload)) {
        const { signedExtensions, specVersion } = payload
        const genesisHash = validateHexString(payload.genesisHash)

        const { registry: fullRegistry } = await getTypeRegistry(
          genesisHash,
          specVersion,
          signedExtensions,
        )

        registry = fullRegistry

        const chain = await chaindataProvider.getNetworkByGenesisHash(genesisHash)
        analyticsProperties.chain = chain?.id ?? genesisHash
      }

      let signature: HexString | undefined = undefined
      let signedTransaction: HexString | Uint8Array | undefined = undefined

      // notify user about transaction progress
      if (isJsonPayload(payload)) {
        const chain = await chaindataProvider.getNetworkByGenesisHash(payload.genesisHash)

        // create signable extrinsic payload
        const extrinsicPayload = registry.createType("ExtrinsicPayload", payload, {
          version: payload.version,
        })

        signature =
          typeof chain?.hasExtrinsicSignatureTypePrefix !== "boolean"
            ? // use default value of `withType`
              // (auto-detected by whether `ExtrinsicSignature` is an `Enum` or not in the chain metadata)
              extrinsicPayload.sign(pair).signature
            : // use override value of `withType` from chaindata
              u8aToHex(
                signExtrinsic(registry, pair, extrinsicPayload.toU8a({ method: true }), {
                  // use chaindata override value of `withType`
                  withType: chain.hasExtrinsicSignatureTypePrefix,
                }),
              )

        if (payload.withSignedTransaction) {
          try {
            const tx = registry.createType(
              "Extrinsic",
              { method: payload.method },
              { version: payload.version },
            )

            // apply signature to the modified payload
            tx.addSignature(payload.address, signature, payload)

            signedTransaction = tx.toHex()
          } catch (cause) {
            const error = new Error(`Failed to create signedTransaction`, { cause })
            sentry.captureException(error, {
              extra: { chainId: chain?.id, chainName: chain?.name },
            })
            throw error
          }
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
            payload.genesisHash,
          )
        }
      } else {
        signature = request.sign(registry, pair).signature
      }

      talismanAnalytics.captureDelayed(
        isJsonPayload(payload) ? "sign transaction approve" : "sign approve",
        {
          ...analyticsProperties,
          networkType: "substrate",
        },
      )

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

    const { request, url, account } = queued
    const { payload: originalPayload } = request
    const payload = modifiedPayload || originalPayload

    const { ok, val: hostName } = getHostName(url)
    const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
      dapp: url,
      hostName: ok ? hostName : undefined,
    }

    let signedTransaction: HexString | Uint8Array | undefined = undefined

    if (isJsonPayload(payload)) {
      const genesisHash = validateHexString(payload.genesisHash)
      const chain = await chaindataProvider.getNetworkByGenesisHash(genesisHash)
      analyticsProperties.chain = chain?.id ?? payload.genesisHash

      if (chain) {
        const { signedExtensions, specVersion } = payload
        const genesisHash = validateHexString(payload.genesisHash)
        const { registry } = await getTypeRegistry(genesisHash, specVersion, signedExtensions)

        if (payload.withSignedTransaction) {
          const tx = registry.createType(
            "Extrinsic",
            { method: payload.method },
            { version: payload.version },
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
          payload.genesisHash,
        )
      }
    }

    queued.resolve({ id, signature, signedTransaction })

    const hardwareType: "ledger" | "qr" | undefined =
      account.type === "ledger-polkadot"
        ? "ledger"
        : account.type === "polkadot-vault"
          ? "qr"
          : undefined

    talismanAnalytics.captureDelayed(
      isJsonPayload(payload) ? "sign transaction approve" : "sign approve",
      {
        ...analyticsProperties,
        networkType: "substrate",
        hardwareType,
      },
    )

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
    assert(queued.account.type === "signet", "Invalid Signet account")
    assert(typeof queued.account.url === "string", "Invalid Signet account")

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
      url: `${addTrailingSlash(queued.account.url)}sign?${params.toString()}`,
      active: true,
    })

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port,
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
