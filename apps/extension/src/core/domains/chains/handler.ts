import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { generateQrAddNetworkSpecs, generateQrUpdateNetworkMetadata } from "@core/libs/QrGenerator"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { assert, u8aToHex } from "@polkadot/util"
import { CustomSubNativeToken, subNativeTokenId } from "@talismn/balances-substrate-native"
import { CustomChain, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { MessageHandler, MessageTypes, RequestType, RequestTypes, ResponseType } from "core/types"

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
      const existingChain = await chaindataProvider.getChain(chain.id)
      const existingToken = existingChain?.nativeToken?.id
        ? await chaindataProvider.getToken(existingChain.nativeToken.id)
        : null

      const newToken: CustomSubNativeToken = {
        id: subNativeTokenId(chain.id, chain.nativeTokenSymbol),
        type: "substrate-native",
        isTestnet: chain.isTestnet,
        symbol: chain.nativeTokenSymbol,
        decimals: chain.nativeTokenDecimals,
        existentialDeposit: "0", // TODO: query this
        logo: chain.nativeTokenLogoUrl ?? githubUnknownTokenLogoUrl,
        coingeckoId: chain.nativeTokenCoingeckoId ?? "",
        chain: { id: chain.id },
        evmNetwork: existingToken?.evmNetwork,
        isCustom: true,
      }

      const newChain: CustomChain = {
        // EvmNetwork
        id: chain.id,
        isTestnet: chain.isTestnet,
        sortIndex: existingChain?.sortIndex ?? null,
        genesisHash: chain.genesisHash,
        prefix: 42, // TODO: query this
        name: chain.name,
        themeColor: "#505050",
        logo: chain.chainLogoUrl ?? null,
        chainName: "", // TODO: query this
        implName: "", // TODO: query this
        specName: "", // TODO: query this
        specVersion: "", // TODO: query this
        nativeToken: { id: newToken.id },
        tokens: existingChain?.tokens ?? [],
        account: chain.accountFormat,
        subscanUrl: chain.subscanUrl ?? null,
        chainspecQrUrl: null,
        latestMetadataQrUrl: null,
        isUnknownFeeToken: false,
        rpcs: chain.rpcs.map(({ url }) => ({ url, isHealthy: true })),
        isHealthy: true,
        evmNetworks: existingChain?.evmNetworks ?? [],

        parathreads: [],

        paraId: null,
        relay: null,

        balanceMetadata: [],

        // CustomChain
        isCustom: true,
      }

      await chaindataProvider.addCustomToken(newToken)

      // if symbol changed, id is different and previous native token must be deleted
      if (existingToken && existingToken.id !== newToken.id)
        await chaindataProvider.removeToken(existingToken.id)

      await chaindataProvider.addCustomChain(newChain)

      talismanAnalytics.capture(`${existingChain ? "update" : "create"} custom chain`, {
        network: chain.id,
      })
    })

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
        return chaindataProvider.hydrateChains()

      case "pri(chains.upsert)":
        return this.chainUpsert(request as RequestTypes["pri(chains.upsert)"])

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
