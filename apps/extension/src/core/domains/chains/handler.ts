import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { generateQrAddNetworkSpecs, generateQrUpdateNetworkMetadata } from "@core/libs/QrGenerator"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { WsProvider } from "@polkadot/api"
import { assert, u8aToHex } from "@polkadot/util"
import { CustomSubNativeToken, subNativeTokenId } from "@talismn/balances"
import {
  BalancesMetadata,
  CustomChain,
  githubUnknownTokenLogoUrl,
} from "@talismn/chaindata-provider"
import {
  $metadataV14,
  PalletMV14,
  StorageEntryMV14,
  filterMetadataPalletsAndItems,
  transformMetadataV14,
} from "@talismn/scale"
import * as $ from "@talismn/subshape-fork"
import { sleep } from "@talismn/util"
import { MessageHandler, MessageTypes, RequestType, RequestTypes, ResponseType } from "core/types"
import Dexie from "dexie"

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
    let customBalancesMetadata: BalancesMetadata[] | undefined = undefined
    if (chain.id === `custom-${chain.genesisHash}`) {
      // When saving custom chains, download the chain metadata and build some SCALE types so we can fetch balances.
      //
      // TODO: Replace this with a scheduled background task which maintains (keeps up to date) the required SCALE types for *all* chains, not just custom ones.

      const rpcUrl = chain.rpcs?.find((rpc) => rpc.url && /^wss?:\/\/.+$/.test(rpc.url))
      if (!rpcUrl) throw new Error("No valid RPC found")

      const ws = new WsProvider(rpcUrl.url, 0)
      // TODO: Store miniMetadata with genesisHash|specName|specVersion index for scheduled background task
      const metadataRpc = await (async () => {
        try {
          await ws.connect()

          const isReadyTimeout = sleep(10_000).then(() => {
            throw new Error("timeout")
          })
          await Promise.race([ws.isReady, isReadyTimeout])

          return await ws.send<string>("state_getMetadata", [])
        } finally {
          ws.disconnect()
        }
      })()

      const metadata = $metadataV14.decode($.decodeHex(metadataRpc))

      const subshape = transformMetadataV14(metadata) // need full metadata
      const existentialDeposit = (
        subshape.pallets.Balances?.constants.ExistentialDeposit?.codec.decode?.(
          subshape.pallets.Balances.constants.ExistentialDeposit.value
        ) ?? 0n
      ).toString()

      const isSystemPallet = (pallet: PalletMV14) => pallet.name === "System"
      const isAccountItem = (item: StorageEntryMV14) => item.name === "Account"

      const isBalancesPallet = (pallet: PalletMV14) => pallet.name === "Balances"
      const isLocksItem = (item: StorageEntryMV14) => item.name === "Locks"

      filterMetadataPalletsAndItems(metadata, [
        { pallet: isSystemPallet, items: [isAccountItem] },
        { pallet: isBalancesPallet, items: [isLocksItem] },
      ])
      metadata.extrinsic.signedExtensions = []

      const miniMetadata = $.encodeHexPrefixed($metadataV14.encode(metadata))
      // TODO: Use this inside the balance modules instead of TypeRegistry
      // const metadataSubshape = transformMetadataV14(metadata)

      customBalancesMetadata = [
        {
          moduleType: "substrate-native",
          metadata: {
            isTestnet: chain.isTestnet,
            symbol: chain.nativeTokenSymbol,
            decimals: chain.nativeTokenDecimals,
            existentialDeposit,
            nominationPoolsPalletId: null, // TODO: Extract this from the metadata (NominationPools pallet constants)
            crowdloanPalletId: null, // TODO: Extract this from the metadata (Crowdloan pallet constants)
            metadata: miniMetadata,
            metadataVersion: metadata.version,
          },
        },
      ]
    }

    const existingChain = await chaindataProvider.getChain(chain.id)

    await chaindataProvider.transaction("rw", ["chains", "tokens"], async () => {
      const existingToken = existingChain?.nativeToken?.id
        ? await chaindataProvider.getToken(existingChain.nativeToken.id)
        : null

      const newToken: CustomSubNativeToken = {
        id: subNativeTokenId(chain.id),
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
        id: chain.id,
        isTestnet: chain.isTestnet,
        isDefault: false,
        sortIndex: existingChain?.sortIndex ?? null,
        genesisHash: chain.genesisHash,
        prefix: existingChain?.prefix ?? 42, // TODO: query this
        name: chain.name,
        themeColor: existingChain?.themeColor ?? "#505050",
        logo: chain.chainLogoUrl ?? null,
        chainName: existingChain?.chainName ?? "", // TODO: query this
        chainType: existingChain?.chainType ?? "", // TODO: query this
        implName: existingChain?.implName ?? "", // TODO: query this
        specName: existingChain?.specName ?? "", // TODO: query this
        specVersion: existingChain?.specVersion ?? "", // TODO: query this
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

        balancesConfig: [],
        balancesMetadata: customBalancesMetadata ?? existingChain?.balancesMetadata ?? [],

        // CustomChain
        isCustom: true,
      }

      await chaindataProvider.addCustomToken(newToken)
      await chaindataProvider.addCustomChain(newChain)
      Dexie.waitFor(await activeChainsStore.setActive(newChain.id, true))

      // if symbol changed, id is different and previous native token must be deleted
      // note: keep this code to allow for cleanup of custom chains edited prior 1.21.0
      if (existingToken && existingToken.id !== newToken.id)
        await chaindataProvider.removeToken(existingToken.id)
    })

    talismanAnalytics.capture(`${existingChain ? "update" : "create"} custom chain`, {
      network: chain.id,
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
