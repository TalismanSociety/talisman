import { AccountTypes } from "@core/domains/accounts/types"
import type {
  KnownSigningRequestIdOnly,
  RequestSigningApproveSignature,
} from "@core/domains/signing/types"
import { watchSubstrateTransaction } from "@core/domains/transactions"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { MessageTypes, RequestType, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getTransactionDetails } from "@core/util/getTransactionDetails"
import { getTypeRegistry } from "@core/util/getTypeRegistry"
import { isJsonPayload } from "@core/util/isJsonPayload"
import { TypeRegistry } from "@polkadot/types"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"

export default class SigningHandler extends ExtensionHandler {
  private async signingApprove({ id }: KnownSigningRequestIdOnly<"substrate-sign">) {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject, request, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const { payload } = request
      const analyticsProperties: { dapp: string; chain?: string } = { dapp: queued.url }

      // an empty registry is sufficient, we don't need metadata here
      let registry = new TypeRegistry()

      if (isJsonPayload(payload)) {
        const { genesisHash, signedExtensions, specVersion, blockHash } = payload

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
        } else {
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
      else result.unwrap() // Throws error
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

    const analyticsProperties: { dapp: string; chain?: string } = { dapp: url }
    const account = keyring.getAccount(accountAddress)

    if (isJsonPayload(payload)) {
      const { genesisHash } = payload
      const chain = await chaindataProvider.getChain({ genesisHash })
      analyticsProperties.chain = chain?.chainName

      if (chain) {
        const { registry } = await getTypeRegistry(genesisHash)
        await watchSubstrateTransaction(chain, registry, payload, signature, {
          siteUrl: url,
          notifications: true,
        })
      } else {
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
      : account?.meta.origin === AccountTypes.QR
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

  private async decode({ id }: KnownSigningRequestIdOnly<"substrate-sign">) {
    const queued = requestStore.getRequest(id)
    if (!queued) return null

    if (!isJsonPayload(queued.request.payload)) return null

    // analyse the call to extract args and docs
    return getTransactionDetails(queued.request.payload)
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestType<TMessageType>,
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

      case "pri(signing.details)":
        return this.decode(request as RequestType<"pri(signing.details)">)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
