import { TEST } from "@core/constants"
import { AccountType } from "@core/domains/accounts/types"
import type {
  KnownSigningRequestIdOnly,
  RequestSigningApproveSignature,
  SignerPayloadJSON,
} from "@core/domains/signing/types"
import { watchSubstrateTransaction } from "@core/domains/transactions"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { validateHexString } from "@core/util/validateHexString"
import { TypeRegistry } from "@polkadot/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { encodeAnyAddress } from "@talismn/util"
import Browser from "webextension-polyfill"

import { windowManager } from "../../libs/WindowManager"
import { getHostName } from "../app/helpers"

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({ id }: KnownSigningRequestIdOnly<"substrate-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve, url } = queued

    const address = encodeAnyAddress(queued.account.address)

    const result = await getPairForAddressSafely(address, async (pair) => {
      const { payload } = request
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

        const chain = await chaindataProvider.getChain({ genesisHash })
        analyticsProperties.chain = chain?.chainName ?? genesisHash
      }

      const { signature } = request.sign(registry, pair)

      // notify user about transaction progress
      if (isJsonPayload(payload)) {
        const chains = Object.values(await chaindataProvider.chains())
        const chain = chains.find((c) => c.genesisHash === payload.genesisHash)

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
      }

      talismanAnalytics.captureDelayed("sign transaction approve", {
        ...analyticsProperties,
        networkType: "substrate",
      })

      resolve({
        id,
        signature,
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
  }: RequestSigningApproveSignature): Promise<boolean> {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const {
      request,
      url,
      account: { address: accountAddress },
    } = queued
    const { payload } = request

    const { ok, val: hostName } = getHostName(url)
    const analyticsProperties: { dapp: string; chain?: string; hostName?: string } = {
      dapp: url,
      hostName: ok ? hostName : undefined,
    }
    const account = keyring.getAccount(accountAddress)

    if (isJsonPayload(payload)) {
      const genesisHash = validateHexString(payload.genesisHash)
      const chain = await chaindataProvider.getChain({ genesisHash })
      analyticsProperties.chain = chain?.chainName ?? undefined

      if (chain) {
        const { registry } = await getTypeRegistry(genesisHash)
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

    queued.resolve({ id, signature })

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

    const all = await Browser.windows.getAll()
    const openerPopupWindow = await Browser.windows.getCurrent()

    // @dev need some way to actually hide the popup without closing it, any idea how??
    await Browser.windows.update(openerPopupWindow.id ?? -1, {
      focused: false,
      drawAttention: false,
      left: 0,
      top: 0,
      width: 1,
      height: 1,
    })

    // find a window that is not popup (the initiating window), signet needs to be opened in a normal window
    let approvingWindow = all.find(({ type }) => type === "normal")

    // somehow all normal windows are closed, create a new one
    if (!approvingWindow) approvingWindow = await Browser.windows.create({ focused: true })

    const tab = await windowManager.openSignet(
      `${queued.account.signetUrl}/sign?${params.toString()}`,
      approvingWindow.id
    )

    await new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        const handleTabClosed = async () => {
          clearInterval(intervalId)

          // bring the popup "back to focus"
          await Browser.windows.update(openerPopupWindow.id ?? -1, {
            focused: true,
            drawAttention: true,
            width: openerPopupWindow.width,
            height: openerPopupWindow.height,
            top: openerPopupWindow.top,
            left: openerPopupWindow.left,
          })
          reject(new Error("Signet tab closed."))
        }
        try {
          // tab.id defaults to -1 which will result in error and hence handle tab being closed gracefully
          const tabRef = await Browser.tabs.get(tab.id ?? -1)
          if (!tabRef) handleTabClosed()
        } catch (e) {
          // tab is closed and hence Browser.tabs.get will throw an error
          handleTabClosed()
        }
      }, 500)
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
