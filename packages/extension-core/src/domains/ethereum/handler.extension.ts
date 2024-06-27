import { SignTypedDataVersion, personalSign, signTypedData } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { CustomEvmNativeToken, evmNativeTokenId } from "@talismn/balances"
import { CustomEvmNetwork, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import Dexie from "dexie"
import { DEBUG, log } from "extension-shared"
import { privateKeyToAccount } from "viem/accounts"

import { getPairForAddressSafely } from "../../handlers/helpers"
import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getPrivateKey } from "../../util/getPrivateKey"
import { getHostName } from "../app/helpers"
import { activeTokensStore } from "../tokens/store.activeTokens"
import { watchEthereumTransaction } from "../transactions"
import { getHumanReadableErrorMessage } from "./errors"
import { ETH_ERROR_EIP1993_USER_REJECTED, EthProviderRpcError } from "./EthProviderRpcError"
import { parseTransactionRequest } from "./helpers"
import { activeEvmNetworksStore, isEvmNetworkActive } from "./store.activeEvmNetworks"
import { getTransactionCount, incrementTransactionCount } from "./transactionCountManager"
import { ETH_NETWORK_ADD_PREFIX } from "./types"

export class EthHandler extends ExtensionHandler {
  private signAndSendApproveHardware: MessageHandler<"pri(eth.signing.approveSignAndSendHardware)"> =
    async ({ id, unsigned, signedPayload }) => {
      try {
        const queued = requestStore.getRequest(id)
        assert(queued, "Unable to find request")

        const {
          method,
          resolve,
          ethChainId,
          account: { address: accountAddress },
        } = queued

        const client = await chainConnectorEvm.getPublicClientForEvmNetwork(ethChainId)
        assert(client, "Unable to find client for chain " + ethChainId)

        const hash = await client.sendRawTransaction({
          serializedTransaction: signedPayload,
        })

        watchEthereumTransaction(ethChainId, hash, unsigned, {
          siteUrl: queued.url,
          notifications: true,
        })

        if (unsigned.from) incrementTransactionCount(unsigned.from, ethChainId)

        resolve(hash)

        const account = keyring.getAccount(accountAddress)
        const { val: host, ok } = getHostName(queued.url)

        talismanAnalytics.captureDelayed("sign transaction approve", {
          method,
          hostName: ok ? host : null,
          dapp: queued.url,
          chain: Number(ethChainId),
          networkType: "ethereum",
          hardwareType: account?.meta.hardwareType,
        })
        return true
      } catch (err) {
        // eslint-disable-next-line no-console
        DEBUG && console.error("signAndSendApproveHardware", { err })
        throw new Error(getHumanReadableErrorMessage(err) ?? "Failed to send transaction")
      }
    }

  private signAndSendApprove: MessageHandler<"pri(eth.signing.approveSignAndSend)"> = async ({
    id,
    transaction,
  }) => {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")
    const { resolve, reject, ethChainId, account, url } = queued

    assert(isEthereumAddress(account.address), "Invalid ethereum address")

    const tx = parseTransactionRequest(transaction)
    if (tx.nonce === undefined) tx.nonce = await getTransactionCount(account.address, ethChainId)

    const result = await getPairForAddressSafely(account.address, async (pair) => {
      const client = await chainConnectorEvm.getWalletClientForEvmNetwork(ethChainId)
      assert(client, "Missing client for chain " + ethChainId)

      const password = await this.stores.password.getPassword()
      assert(password, "Unauthorised")

      const privateKey = getPrivateKey(pair, password, "hex")
      const account = privateKeyToAccount(privateKey)

      return await client.sendTransaction({
        chain: client.chain,
        account,
        ...tx,
      })
    })

    if (result.ok) {
      watchEthereumTransaction(ethChainId, result.val, transaction, {
        siteUrl: queued.url,
        notifications: true,
      })

      incrementTransactionCount(account.address, ethChainId)

      resolve(result.val)

      const { val: host, ok } = getHostName(url)
      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        hostName: ok ? host : null,
        dapp: url,
        chain: Number(ethChainId),
        networkType: "ethereum",
      })

      return true
    } else {
      if (result.val === "Unauthorised") {
        reject(Error(result.val))
      } else {
        throw new Error(getHumanReadableErrorMessage(result.val) ?? "Failed to send transaction")
      }
      return false
    }
  }

  private sendSigned: MessageHandler<"pri(eth.signing.sendSigned)"> = async ({
    evmNetworkId,
    unsigned,
    signed,
    transferInfo,
  }) => {
    assert(evmNetworkId, "chainId is not defined")

    const client = await chainConnectorEvm.getWalletClientForEvmNetwork(evmNetworkId)
    assert(client, "Missing client for chain " + evmNetworkId)

    try {
      const hash = await client.sendRawTransaction({ serializedTransaction: signed })

      watchEthereumTransaction(evmNetworkId, hash, unsigned, {
        notifications: true,
        transferInfo,
      })

      talismanAnalytics.captureDelayed("send transaction", {
        type: "evm send signed",
        chain: Number(evmNetworkId),
        networkType: "ethereum",
      })

      return hash as HexString
    } catch (err) {
      throw new Error(getHumanReadableErrorMessage(err) ?? "Failed to send transaction")
    }
  }

  private signAndSend: MessageHandler<"pri(eth.signing.signAndSend)"> = async ({
    evmNetworkId,
    unsigned,
    transferInfo,
  }) => {
    assert(evmNetworkId, "chainId is not defined")
    assert(unsigned.from, "from is not defined")

    const result = await getPairForAddressSafely(unsigned.from, async (pair) => {
      const client = await chainConnectorEvm.getWalletClientForEvmNetwork(evmNetworkId)
      assert(client, "Missing client for chain " + evmNetworkId)

      const password = await this.stores.password.getPassword()
      assert(password, "Unauthorised")
      const privateKey = getPrivateKey(pair, password, "hex")
      const account = privateKeyToAccount(privateKey)

      const tx = parseTransactionRequest(unsigned)

      return await client.sendTransaction({
        chain: client.chain,
        account,
        ...tx,
      })
    })

    if (result.ok) {
      watchEthereumTransaction(evmNetworkId, result.val, unsigned, {
        notifications: true,
        transferInfo,
      })

      talismanAnalytics.captureDelayed("send transaction", {
        type: "evm sign and send",
        chain: Number(evmNetworkId),
        networkType: "ethereum",
      })

      return result.val // hash
    } else {
      if (result.val === "Unauthorised") {
        throw new Error("Unauthorized")
      } else {
        throw new Error(getHumanReadableErrorMessage(result.val) ?? "Failed to send transaction")
      }
    }
  }

  private signApproveHardware: MessageHandler<"pri(eth.signing.approveSignHardware)"> = ({
    id,
    signedPayload,
  }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const {
      method,
      resolve,
      account: { address: accountAddress },
      url,
    } = queued

    resolve(signedPayload)

    const account = keyring.getAccount(accountAddress)
    const { ok, val: host } = getHostName(url)
    talismanAnalytics.captureDelayed("sign approve", {
      method,
      isHardware: true,
      hostName: ok ? host : null,
      dapp: url,
      chain: Number(queued.ethChainId),
      networkType: "ethereum",
      hardwareType: account?.meta.hardwareType,
    })

    return true
  }

  private signApprove: MessageHandler<"pri(eth.signing.approveSign)"> = async ({ id }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { method, request, reject, resolve, url } = queued

    const { val, ok } = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const pw = await this.stores.password.getPassword()
      assert(pw, "Unauthorised")
      const privateKey = getPrivateKey(pair, pw, "buffer")
      let signature: string

      if (method === "personal_sign") {
        signature = personalSign({ privateKey, data: request })
      } else if (["eth_signTypedData", "eth_signTypedData_v1"].includes(method)) {
        signature = signTypedData({
          privateKey,
          data: JSON.parse(request as string),
          version: SignTypedDataVersion.V1,
        })
      } else if (method === "eth_signTypedData_v3") {
        signature = signTypedData({
          privateKey,
          data: JSON.parse(request as string),
          version: SignTypedDataVersion.V3,
        })
      } else if (method === "eth_signTypedData_v4") {
        signature = signTypedData({
          privateKey,
          data: JSON.parse(request as string),
          version: SignTypedDataVersion.V4,
        })
      } else {
        throw new Error(`Unsupported method : ${method}`)
      }

      resolve(signature)

      const { ok, val: host } = getHostName(url)

      talismanAnalytics.captureDelayed("sign approve", {
        method,
        isHardware: true,
        hostName: ok ? host : null,
        dapp: queued.url,
        chain: Number(queued.ethChainId),
        networkType: "ethereum",
      })

      return true
    })

    if (ok) return val
    if (val === "Unauthorised") {
      reject(Error(val))
    } else {
      const msg = getHumanReadableErrorMessage(val)
      if (msg) throw new Error(msg)
      else throw new Error("Unable to complete transaction")
    }
    return false
  }

  private signingCancel: MessageHandler<"pri(eth.signing.cancel)"> = ({ id }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Cancelled", ETH_ERROR_EIP1993_USER_REJECTED))

    talismanAnalytics.captureDelayed("sign reject", {
      method: queued.method,
      dapp: queued.url,
      chain: Number(queued.ethChainId),
    })

    return true
  }

  private ethNetworkAddCancel: MessageHandler<"pri(eth.networks.add.cancel)"> = ({ id }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private ethNetworkAddApprove: MessageHandler<"pri(eth.networks.add.approve)"> = async ({
    id,
    enableDefault,
  }) => {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")

    const { network, resolve } = queued
    const networkId = parseInt(network.chainId, 16).toString()
    const known = await chaindataProvider.evmNetworkById(networkId)

    if (enableDefault) {
      assert(known?.nativeToken?.id, "Network not found")

      await activeEvmNetworksStore.setActive(known.id, true)

      talismanAnalytics.captureDelayed("add network evm", {
        network: network.chainName,
        isCustom: false,
      })
    } else {
      const knownNativeTokenConfig = known?.balancesConfig.find(
        (mod) => mod.moduleType === "evm-native"
      )?.moduleConfig as { coingeckoId?: string; logo?: string }

      const isTestnet =
        known?.isTestnet || queued.network.chainName.toLowerCase().includes("testnet")

      const newToken: CustomEvmNativeToken | null = network.nativeCurrency
        ? {
            id: `${networkId}-evm-native`.toLowerCase(),
            type: "evm-native",
            isTestnet: isTestnet,
            symbol: network.nativeCurrency.symbol,
            decimals: network.nativeCurrency.decimals,
            logo:
              (network.iconUrls || [knownNativeTokenConfig?.logo])[0] || githubUnknownTokenLogoUrl,
            evmNetwork: { id: networkId },
            isCustom: true,
            coingeckoId: knownNativeTokenConfig?.coingeckoId,
            // TODO fix typings and include this
            // mirrorOf: "mirrorOf" in knownNativeTokenConfig ? knownNativeTokenConfig.mirrorOf : undefined
          }
        : null

      const existingNetwork = await chaindataProvider.evmNetworkById(networkId)

      const newNetwork: CustomEvmNetwork = {
        id: networkId,
        isTestnet: isTestnet,
        isDefault: existingNetwork?.isDefault ?? false,
        sortIndex: null,
        name: network.chainName,
        themeColor: "#505050",
        logo: (network.iconUrls || [known?.logo])[0] ?? null,
        nativeToken: newToken ? { id: newToken.id } : null,
        tokens: [],
        explorerUrl: (network.blockExplorerUrls || [])[0],
        rpcs: (network.rpcUrls || []).map((url) => ({ url })),
        substrateChain: null,
        isCustom: true,
        explorerUrls: network.blockExplorerUrls || (known?.explorerUrl ? [known.explorerUrl] : []),
        iconUrls: network.iconUrls || [],
        balancesConfig: [],
        balancesMetadata: [],
      }

      await chaindataProvider.addCustomEvmNetwork(newNetwork)
      if (newToken) await chaindataProvider.addCustomToken(newToken)

      await activeEvmNetworksStore.setActive(newNetwork.id, true)

      talismanAnalytics.captureDelayed("add network evm", {
        network: network.chainName,
        isCustom: true,
      })
    }

    resolve(null)

    return true
  }

  private ethNetworkUpsert: MessageHandler<"pri(eth.networks.upsert)"> = async (network) => {
    const existingNetwork = await chaindataProvider.evmNetworkById(network.id)

    try {
      await chaindataProvider.transaction("rw", ["evmNetworks", "tokens"], async () => {
        const existingToken = existingNetwork?.nativeToken?.id
          ? await chaindataProvider.tokenById(existingNetwork.nativeToken.id)
          : null

        const newToken: CustomEvmNativeToken = {
          id: evmNativeTokenId(network.id),
          type: "evm-native",
          isTestnet: network.isTestnet,
          symbol: network.tokenSymbol,
          decimals: network.tokenDecimals,
          logo: network.tokenLogoUrl ?? githubUnknownTokenLogoUrl,
          coingeckoId: network.tokenCoingeckoId ?? "",
          chain: existingToken?.chain,
          evmNetwork: { id: network.id },
          isCustom: true,
        }

        const newNetwork: CustomEvmNetwork = {
          // EvmNetwork
          id: network.id,
          isTestnet: network.isTestnet,
          isDefault: existingNetwork?.isDefault ?? false,
          sortIndex: existingNetwork?.sortIndex ?? null,
          name: network.name,
          themeColor: "#505050",
          logo: network.chainLogoUrl ?? null,
          nativeToken: { id: newToken.id },
          tokens: existingNetwork?.tokens ?? [],
          explorerUrl: network.blockExplorerUrl ?? null,
          rpcs: network.rpcs.map(({ url }) => ({ url })),
          substrateChain: existingNetwork?.substrateChain ?? null,
          balancesConfig: [],
          balancesMetadata: [],
          // CustomEvmNetwork
          isCustom: true,
          explorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : [],
          iconUrls: [],
        }

        await chaindataProvider.addCustomToken(newToken)
        await chaindataProvider.addCustomEvmNetwork(newNetwork)
        await Dexie.waitFor(activeEvmNetworksStore.setActive(newNetwork.id, true))

        // if symbol changed, id is different and previous native token must be deleted
        // note: keep this code to allow for cleanup of custom chains edited prior 1.21.0
        if (existingToken && existingToken.id !== newToken.id)
          await chaindataProvider.removeToken(existingToken.id)

        // RPCs may have changed, clear cache
        chainConnectorEvm.clearRpcProvidersCache(network.id)
      })

      talismanAnalytics.capture(`${existingNetwork ? "update" : "create"} custom network`, {
        networkType: "evm",
        network: network.id.toString(),
      })

      return true
    } catch (err) {
      log.error("ethNetworkUpsert", { err })
      throw new Error("Error saving network", { cause: err })
    }
  }

  private ethNetworkRemove: MessageHandler<"pri(eth.networks.remove)"> = async (request) => {
    await chaindataProvider.removeCustomEvmNetwork(request.id)

    talismanAnalytics.capture("remove custom network", {
      networkType: "evm",
      network: request.id,
    })

    chainConnectorEvm.clearRpcProvidersCache(request.id)

    return true
  }

  private ethNetworkReset: MessageHandler<"pri(eth.networks.reset)"> = async (request) => {
    const network = await chaindataProvider.evmNetworkById(request.id)
    const isActive = network && isEvmNetworkActive(network, await activeEvmNetworksStore.get())

    if (isActive) {
      // network may be active only because it's a custom network,
      // enforce the value or the network could be deactivated unintentionally
      activeEvmNetworksStore.setActive(request.id, true)
    }

    await chaindataProvider.resetEvmNetwork(request.id)

    talismanAnalytics.capture("reset custom network", {
      networkType: "evm",
      network: request.id,
    })

    chainConnectorEvm.clearRpcProvidersCache(request.id)

    return true
  }

  private ethWatchAssetRequestCancel: MessageHandler<"pri(eth.watchasset.requests.cancel)"> = ({
    id,
  }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private ethWatchAssetRequestApprove: MessageHandler<"pri(eth.watchasset.requests.approve)"> =
    async ({ id }) => {
      const queued = requestStore.getRequest(id)

      assert(queued, "Unable to find request")
      const { resolve, token } = queued

      const knownToken = await chaindataProvider.tokenById(token.id)
      if (knownToken) {
        await activeTokensStore.setActive(knownToken.id, true)
      } else {
        // some dapps set decimals as a string, which breaks balances
        const safeToken = {
          ...token,
          decimals: Number(token.decimals),
        }
        const newTokenId = await chaindataProvider.addCustomToken(safeToken)
        if (newTokenId) await activeTokensStore.setActive(newTokenId, true)
      }

      talismanAnalytics.captureDelayed("add asset evm", {
        contractAddress: token.contractAddress,
        symbol: token.symbol,
        network: token.evmNetwork,
        isCustom: !knownToken,
      })

      resolve(true)

      return true
    }

  private ethRequest: MessageHandler<"pri(eth.request)"> = async ({ chainId, method, params }) => {
    const client = await chainConnectorEvm.getPublicClientForEvmNetwork(chainId)
    assert(client, `No client for chain ${chainId}`)

    return client.request({
      method: method as never,
      params: params as never,
    })
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // ethereum signing requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.signing.signAndSend)":
        return this.signAndSend(request as RequestTypes["pri(eth.signing.signAndSend)"])

      case "pri(eth.signing.sendSigned)":
        return this.sendSigned(request as RequestTypes["pri(eth.signing.sendSigned)"])

      case "pri(eth.signing.approveSignAndSend)":
        return this.signAndSendApprove(
          request as RequestTypes["pri(eth.signing.approveSignAndSend)"]
        )

      case "pri(eth.signing.approveSign)":
        return this.signApprove(request as RequestTypes["pri(eth.signing.approveSign)"])

      case "pri(eth.signing.approveSignHardware)":
        return this.signApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignHardware)"]
        )

      case "pri(eth.signing.approveSignAndSendHardware)":
        return this.signAndSendApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignAndSendHardware)"]
        )

      case "pri(eth.signing.cancel)":
        return this.signingCancel(request as RequestTypes["pri(eth.signing.cancel)"])

      // --------------------------------------------------------------------
      // ethereum watch asset requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.watchasset.requests.cancel)":
        return this.ethWatchAssetRequestCancel(
          request as RequestTypes["pri(eth.watchasset.requests.cancel)"]
        )

      case "pri(eth.watchasset.requests.approve)":
        return this.ethWatchAssetRequestApprove(
          request as RequestTypes["pri(eth.watchasset.requests.approve)"]
        )

      // --------------------------------------------------------------------
      // ethereum network handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(eth.networks.add.cancel)":
        return this.ethNetworkAddCancel(request as RequestTypes["pri(eth.networks.add.cancel)"])

      case "pri(eth.networks.add.approve)":
        return this.ethNetworkAddApprove(request as RequestTypes["pri(eth.networks.add.approve)"])

      case "pri(eth.networks.add.requests)":
        return requestStore.getAllRequests(ETH_NETWORK_ADD_PREFIX)

      case "pri(eth.networks.subscribe)":
        // TODO: Run this on a timer or something instead of when subscribing to evmNetworks
        await updateAndWaitForUpdatedChaindata({ updateSubstrateChains: false })
        return true

      case "pri(eth.networks.upsert)":
        return this.ethNetworkUpsert(request as RequestTypes["pri(eth.networks.upsert)"])

      case "pri(eth.networks.remove)":
        return this.ethNetworkRemove(request as RequestTypes["pri(eth.networks.remove)"])

      case "pri(eth.networks.reset)":
        return this.ethNetworkReset(request as RequestTypes["pri(eth.networks.reset)"])

      // --------------------------------------------------------------------
      // ethereum other handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(eth.transactions.count)": {
        const { address, evmNetworkId } = request as RequestTypes["pri(eth.transactions.count)"]
        return getTransactionCount(address, evmNetworkId)
      }

      case "pri(eth.request)":
        return this.ethRequest(request as RequestTypes["pri(eth.request)"])
    }
    throw new Error(`Unable to handle message of type ${type}`)
  }
}
