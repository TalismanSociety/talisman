import { TEST } from "@common/constants"
import { encodeAnyAddress, signSubstrate, vrfSign } from "@talismn/crypto"
import type { HexString } from "@talismn/util"
import { addTrailingSlash, assert, u8aToHex, u8aWrapBytes } from "@talismn/util"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { windowManager } from "../../libs/WindowManager"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "../../types"
import type { Port } from "../../types/base"
import { isJsonPayload } from "../../util/isJsonPayload"
import { validateHexString } from "../../util/validateHexString"
import { getHostName } from "../app/helpers"
import { withSecretKey } from "../keyring/withSecretKey"
import { watchSubstrateTransaction } from "../transactions"
import { assembleSubstrateTransaction, signSubstratePayload } from "./signSubstratePayload"
import type {
  KnownSigningRequestApprove,
  KnownSigningRequestIdOnly,
  RequestSigningApproveSignature,
  SignerPayloadJSON,
  SignerPayloadRaw,
} from "./types"
import { parseVrfSignPayload } from "./vrf"

/**
 * Only return `signedTransaction` to the dapp when the wallet actually altered the payload
 * (CheckMetadataHash injection). When returned needlessly, older @polkadot/api releases rebuild
 * the extrinsic from a hardcoded field list that drops chain-specific payload fields (e.g. Avail's
 * `appId`), attaching our signature to different bytes => "1010: bad signature" on submission.
 * Without it, the dapp assembles the extrinsic from its own payload with its own registry.
 */
const isPayloadModified = (
  original: SignerPayloadJSON | SignerPayloadRaw,
  modified: SignerPayloadJSON | undefined
) => !!modified && JSON.stringify(modified) !== JSON.stringify(original)

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({
    id,
    payload: modifiedPayload,
  }: KnownSigningRequestApprove<"substrate-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve, url } = queued

    const address = encodeAnyAddress(queued.account.address)

    const result = await withSecretKey(address, async (secretKey, curve) => {
      const { payload: originalPayload } = request
      const payload = modifiedPayload || originalPayload
      const { ok, val: hostName } = getHostName(url)
      const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
        dapp: url,
        hostName: ok ? hostName : undefined,
      }

      let signature: HexString | undefined
      let signedTransaction: HexString | Uint8Array | undefined

      if (isJsonPayload(payload)) {
        const genesisHash = validateHexString(payload.genesisHash)
        const chain = await chaindataProvider.getNetworkByGenesisHash(genesisHash)
        analyticsProperties.chain = chain?.id ?? genesisHash

        const signed = await signSubstratePayload(payload, secretKey, curve, {
          // chaindata override of the signature type prefix (LAOS signing quirk),
          // auto-detected from the chain metadata when not set
          hasExtrinsicSignatureTypePrefix:
            typeof chain?.hasExtrinsicSignatureTypePrefix === "boolean"
              ? chain.hasExtrinsicSignatureTypePrefix
              : undefined,
        })
        signature = signed.signature
        if (payload.withSignedTransaction && isPayloadModified(originalPayload, modifiedPayload))
          signedTransaction = signed.signedTransaction

        // notify user about transaction progress
        if (chain) {
          await watchSubstrateTransaction(chain, payload, signature, {
            siteUrl: queued.url,
            notifications: true,
          })
        } else if (!TEST) {
          // biome-ignore lint/suspicious/noConsole: legacy
          console.warn(
            "Unable to find chain for genesis hash, transaction will not be watched",
            payload.genesisHash
          )
        }
      } else {
        // raw bytes request: wrap with <Bytes>...</Bytes> unless already wrapped, no signature type prefix
        // (matches polkadot-js RequestBytesSign.sign)
        signature = u8aToHex(signSubstrate(curve, secretKey, u8aWrapBytes(payload.data)))
      }

      talismanAnalytics.captureDelayed(
        isJsonPayload(payload) ? "sign transaction approve" : "sign approve",
        {
          ...analyticsProperties,
          networkType: "substrate",
        }
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

  private async signingApproveVrf({ id }: KnownSigningRequestIdOnly<"vrf-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve, url } = queued
    const address = encodeAnyAddress(queued.account.address)

    // re-parse rather than trust what was queued, so the secret key is never used on bytes that
    // did not survive the same validation the dapp's request went through
    const { data, context, extra } = parseVrfSignPayload(request.payload)

    const result = await withSecretKey(address, async (secretKey, curve) => {
      assert(curve === "sr25519", "VRF signing is only supported for sr25519 accounts")

      // namespaced so a dapp cannot use the wallet as a VRF oracle for other schnorrkel protocols
      const signature = u8aToHex(vrfSign(secretKey, data, context, extra))

      const { ok, val: hostName } = getHostName(url)
      talismanAnalytics.captureDelayed("vrf sign approve", {
        dapp: url,
        hostName: ok ? hostName : undefined,
        networkType: "substrate",
      })

      resolve({ id, signature })
    })
    if (!result.ok) {
      const error = typeof result.val === "string" ? new Error(result.val) : result.val
      // settle the dapp's promise on every failure path, not just Unauthorised: the request store
      // only drops a request through resolve/reject, so throwing alone leaves it queued
      reject(error)
      if (result.val !== "Unauthorised") throw error
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

    let signedTransaction: HexString | Uint8Array | undefined

    if (isJsonPayload(payload)) {
      const genesisHash = validateHexString(payload.genesisHash)
      const chain = await chaindataProvider.getNetworkByGenesisHash(genesisHash)
      analyticsProperties.chain = chain?.id ?? payload.genesisHash

      if (chain) {
        if (payload.withSignedTransaction && isPayloadModified(originalPayload, modifiedPayload)) {
          const assembled = await assembleSubstrateTransaction(payload, signature)
          signedTransaction = assembled.signedTransaction
        }

        await watchSubstrateTransaction(chain, payload, signature, {
          siteUrl: url,
          notifications: true,
        })
      } else if (!TEST) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.warn(
          "Unable to find chain for genesis hash, transaction will not be watched",
          payload.genesisHash
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
      }
    )

    return true
  }

  private async signingCancel({ id }: KnownSigningRequestIdOnly<"substrate-sign" | "vrf-sign">) {
    /*
     * This method used for both Eth and Polkadot requests
     */
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    talismanAnalytics.captureDelayed(
      queued.type === "vrf-sign" ? "vrf sign reject" : "sign reject",
      { networkType: "substrate" }
    )
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
    _id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
    _port: Port
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

      case "pri(signing.approveSign.vrf)":
        return await this.signingApproveVrf(request as RequestType<"pri(signing.approveSign.vrf)">)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
