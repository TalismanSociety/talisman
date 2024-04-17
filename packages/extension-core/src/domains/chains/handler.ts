import { assert, u8aToHex } from "@polkadot/util"
import { CustomSubNativeToken, subNativeTokenId } from "@talismn/balances"
import { CustomChain, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import Dexie from "dexie"

import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { generateQrAddNetworkSpecs, generateQrUpdateNetworkMetadata } from "../../libs/QrGenerator"
import { chaindataProvider } from "../../rpcs/chaindata"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageHandler, MessageTypes, RequestType, RequestTypes, ResponseType } from "../../types"
import { activeChainsStore } from "./store.activeChains"

export class ChainsHandler extends ExtensionHandler {
  private async validateVaultVerifierCertificateMnemonic() {
    const vaultMnemoicId = await this.stores.app.get("vaultVerifierCertificateMnemonicId")
    assert(vaultMnemoicId, "No Polkadot Vault Verifier Certificate Mnemonic set")
    const vaultCipher = await this.stores.mnemonics.get(vaultMnemoicId)
    assert(vaultCipher, "No Polkadot Vault Verifier Certificate Mnemonic found")
    return true
  }

  private chainUpsert: MessageHandler<"pri(chains.upsert)"> = async (chain) => {
    await chaindataProvider.transaction("rw", ["chains", "tokens"], async () => {
      const existingChain = await chaindataProvider.chainById(chain.id)
      const existingToken = existingChain?.nativeToken?.id
        ? await chaindataProvider.tokenById(existingChain.nativeToken.id)
        : null
      const existingNativeToken = existingToken?.type === "substrate-native" ? existingToken : null

      const newToken: CustomSubNativeToken = {
        id: subNativeTokenId(chain.id),
        type: "substrate-native",
        isTestnet: chain.isTestnet,
        symbol: chain.nativeTokenSymbol,
        decimals: chain.nativeTokenDecimals,
        existentialDeposit: existingNativeToken?.existentialDeposit ?? "0", // TODO: query this for custom chains
        logo: chain.nativeTokenLogoUrl ?? githubUnknownTokenLogoUrl,
        chain: { id: chain.id },
        evmNetwork: existingNativeToken?.evmNetwork,
        isCustom: true,
      }

      if (chain.nativeTokenCoingeckoId !== null && chain.nativeTokenCoingeckoId?.length > 0)
        newToken.coingeckoId = chain.nativeTokenCoingeckoId

      const newChain: CustomChain = {
        id: chain.id,
        isTestnet: chain.isTestnet,
        isDefault: false,
        sortIndex: existingChain?.sortIndex ?? null,
        genesisHash: chain.genesisHash,
        prefix: existingChain?.prefix ?? 42, // TODO: query this for custom chains
        name: chain.name,
        themeColor: existingChain?.themeColor ?? "#505050",
        logo: chain.chainLogoUrl ?? null,
        chainName: existingChain?.chainName ?? "", // NOTE: This is kept up to date by miniMetadataUpdater::hydrateCustomChains
        chainType: existingChain?.chainType ?? "", // NOTE: This is kept up to date by miniMetadataUpdater::hydrateCustomChains
        implName: existingChain?.implName ?? "", // NOTE: This is kept up to date by miniMetadataUpdater::hydrateCustomChains
        specName: existingChain?.specName ?? "", // NOTE: This is kept up to date by miniMetadataUpdater::hydrateCustomChains
        specVersion: existingChain?.specVersion ?? "", // NOTE: This is kept up to date by miniMetadataUpdater::hydrateCustomChains
        nativeToken: { id: newToken.id },
        tokens: existingChain?.tokens ?? [{ id: newToken.id }],
        account: chain.accountFormat,
        subscanUrl: chain.subscanUrl ?? null,
        chainspecQrUrl: existingChain?.chainspecQrUrl ?? null,
        latestMetadataQrUrl: existingChain?.latestMetadataQrUrl ?? null,
        isUnknownFeeToken: existingChain?.isUnknownFeeToken ?? false,
        feeToken: existingChain?.feeToken ?? null,
        rpcs: chain.rpcs.map(({ url }) => ({ url })),
        evmNetworks: existingChain?.evmNetworks ?? [],

        parathreads: existingChain?.parathreads ?? [],

        paraId: existingChain?.paraId ?? null,
        relay: existingChain?.relay ?? null,

        balancesConfig: existingChain?.balancesConfig ?? [],
        balancesMetadata: [],

        // CustomChain
        isCustom: true,
      }

      await chaindataProvider.addCustomToken(newToken)
      await chaindataProvider.addCustomChain(newChain)
      await Dexie.waitFor(activeChainsStore.setActive(newChain.id, true))

      // if symbol changed, id is different and previous native token must be deleted
      // note: keep this code to allow for cleanup of custom chains edited prior 1.21.0
      if (existingToken && existingToken.id !== newToken.id)
        await chaindataProvider.removeToken(existingToken.id)

      talismanAnalytics.capture(`${existingChain ? "update" : "create"} custom chain`, {
        network: chain.id,
      })
    })

    // ensure miniMetadatas are immediately updated, but don't wait for them to update before returning
    updateAndWaitForUpdatedChaindata({ updateSubstrateChains: true })

    return true
  }

  private chainRemove: MessageHandler<"pri(chains.remove)"> = async (request) => {
    await chaindataProvider.removeCustomChain(request.id)

    talismanAnalytics.capture("remove custom chain", { chain: request.id })

    return true
  }

  private chainReset: MessageHandler<"pri(chains.reset)"> = async (request) => {
    await chaindataProvider.resetChain(request.id)

    talismanAnalytics.capture("reset chain", { chain: request.id })

    return true
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType]
    // port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // chain handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(chains.subscribe)":
        // TODO: Run this on a timer or something instead of when subscribing to chains
        await updateAndWaitForUpdatedChaindata({ updateSubstrateChains: true })
        return true

      case "pri(chains.upsert)":
        try {
          return this.chainUpsert(request as RequestTypes["pri(chains.upsert)"])
        } catch (err) {
          throw new Error("Error saving chain", { cause: err })
        }

      case "pri(chains.remove)":
        return this.chainRemove(request as RequestTypes["pri(chains.remove)"])

      case "pri(chains.reset)":
        return this.chainReset(request as RequestTypes["pri(chains.reset)"])

      case "pri(chains.generateQr.addNetworkSpecs)": {
        await this.validateVaultVerifierCertificateMnemonic()

        const { genesisHash } = request as RequestType<"pri(chains.generateQr.addNetworkSpecs)">
        const data = await generateQrAddNetworkSpecs(genesisHash)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      case "pri(chains.generateQr.updateNetworkMetadata)": {
        await this.validateVaultVerifierCertificateMnemonic()

        const { genesisHash, specVersion } =
          request as RequestType<"pri(chains.generateQr.updateNetworkMetadata)">
        const data = await generateQrUpdateNetworkMetadata(genesisHash, specVersion)
        // serialize as hex for transfer
        return u8aToHex(data)
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
