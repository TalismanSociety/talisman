import { DEBUG } from "@core/constants"
import { ETH_NETWORK_ADD_PREFIX } from "@core/domains/ethereum/types"
import { CustomEvmNativeToken } from "@core/domains/tokens/types"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import {
  ETH_ERROR_EIP1993_USER_REJECTED,
  EthProviderRpcError,
} from "@core/injectEth/EthProviderRpcError"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { log } from "@core/log"
import { watchEthereumTransaction } from "@core/notifications"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { SignTypedDataVersion, personalSign, signTypedData } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { evmNativeTokenId } from "@talismn/balances-evm-native"
import { CustomEvmNetwork, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

import { getHumanReadableErrorMessage } from "./errors"
import { rebuildTransactionRequestNumbers } from "./helpers"
import { getProviderForEvmNetworkId } from "./rpcProviders"
import { getTransactionCount, incrementTransactionCount } from "./transactionCountManager"

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

        const provider = await getProviderForEvmNetworkId(ethChainId)
        assert(provider, "Unable to find provider for chain " + ethChainId)

        const { chainId, hash, from } = await provider.sendTransaction(signedPayload)

        watchEthereumTransaction(chainId.toString(), hash, unsigned, {
          siteUrl: queued.url,
          notifications: true,
        })

        incrementTransactionCount(from, chainId.toString())

        resolve(hash)

        const account = keyring.getAccount(accountAddress)
        talismanAnalytics.captureDelayed("sign transaction approve", {
          method,
          dapp: queued.url,
          chain: chainId,
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

    const provider = await getProviderForEvmNetworkId(ethChainId)
    assert(provider, "Unable to find provider for chain " + ethChainId)

    // rebuild BigNumber property values (converted to json when serialized)
    const tx = rebuildTransactionRequestNumbers(transaction)
    tx.nonce = await getTransactionCount(account.address, ethChainId)

    const result = await getPairForAddressSafely(account.address, async (pair) => {
      const password = this.stores.password.getPassword()
      assert(password, "Unauthorised")
      const privateKey = getPrivateKey(pair, password)
      const signer = new ethers.Wallet(privateKey, provider)

      const { hash } = await signer.sendTransaction(tx)

      return hash
    })

    if (result.ok) {
      // long running operation, we do not want this inside getPairForAddressSafely
      watchEthereumTransaction(ethChainId, result.val, tx, {
        siteUrl: queued.url,
        notifications: true,
      })

      // TODO remove and compute on the fly based on transactions table
      incrementTransactionCount(account.address, ethChainId)

      resolve(result.val)

      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        dapp: url,
        chain: ethChainId,
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
    unsigned,
    signed,
  }) => {
    assert(unsigned.chainId, "chainId is not defined")
    const evmNetworkId = unsigned.chainId.toString()

    const provider = await getProviderForEvmNetworkId(evmNetworkId)
    assert(provider, `Unable to find provider for chain ${unsigned.chainId}`)

    // rebuild BigNumber property values (converted to json when serialized)
    const tx = rebuildTransactionRequestNumbers(unsigned)

    try {
      const { hash } = await provider.sendTransaction(signed)

      // long running operation, we do not want this inside getPairForAddressSafely
      watchEthereumTransaction(evmNetworkId, hash, tx, {
        notifications: true,
      })

      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        chain: evmNetworkId,
        networkType: "ethereum",
      })

      return hash as HexString
    } catch (err) {
      throw new Error(getHumanReadableErrorMessage(err) ?? "Failed to send transaction")
    }
  }

  private signAndSend: MessageHandler<"pri(eth.signing.signAndSend)"> = async ({ unsigned }) => {
    assert(unsigned.chainId, "chainId is not defined")
    assert(unsigned.from, "from is not defined")
    const evmNetworkId = unsigned.chainId.toString()

    const provider = await getProviderForEvmNetworkId(evmNetworkId)
    assert(provider, `Unable to find provider for chain ${unsigned.chainId}`)

    // rebuild BigNumber property values (converted to json when serialized)
    const tx = rebuildTransactionRequestNumbers(unsigned)

    const result = await getPairForAddressSafely(unsigned.from, async (pair) => {
      const password = this.stores.password.getPassword()
      assert(password, "Unauthorised")
      const privateKey = getPrivateKey(pair, password)
      const signer = new ethers.Wallet(privateKey, provider)

      const { hash } = await signer.sendTransaction(tx)

      return hash as HexString
    })

    if (result.ok) {
      // long running operation, we do not want this inside getPairForAddressSafely
      watchEthereumTransaction(evmNetworkId, result.val, tx, {
        notifications: true,
      })

      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        chain: evmNetworkId,
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
    } = queued

    resolve(signedPayload)

    const account = keyring.getAccount(accountAddress)
    talismanAnalytics.captureDelayed("sign approve", {
      method,
      isHardware: true,
      dapp: queued.url,
      chain: queued.ethChainId,
      networkType: "ethereum",
      hardwareType: account?.meta.hardwareType,
    })

    return true
  }

  private signApprove: MessageHandler<"pri(eth.signing.approveSign)"> = async ({ id }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { method, request, reject, resolve } = queued

    const { val, ok } = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const pw = this.stores.password.getPassword()
      assert(pw, "Unauthorised")
      const privateKey = getPrivateKey(pair, pw)
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

      talismanAnalytics.captureDelayed("sign approve", {
        method,
        isHardware: true,
        dapp: queued.url,
        chain: queued.ethChainId,
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
      chain: queued.ethChainId,
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
  }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { network, resolve } = queued
    const networkId = parseInt(network.chainId, 16).toString()
    const newToken: CustomEvmNativeToken | null = network.nativeCurrency
      ? {
          id: `${networkId}-evm-native-${network.nativeCurrency.symbol}`.toLowerCase(),
          type: "evm-native",
          isTestnet: false,
          symbol: network.nativeCurrency.symbol,
          decimals: network.nativeCurrency.decimals,
          logo: (network.iconUrls || [])[0] || githubUnknownTokenLogoUrl,
          evmNetwork: { id: networkId },
          isCustom: true,
        }
      : null

    const newNetwork: CustomEvmNetwork = {
      id: networkId,
      isTestnet: false,
      sortIndex: null,
      name: network.chainName,
      logo: (network.iconUrls || [])[0] ?? null,
      nativeToken: newToken ? { id: newToken.id } : null,
      tokens: [],
      explorerUrl: (network.blockExplorerUrls || [])[0],
      rpcs: (network.rpcUrls || []).map((url) => ({ url, isHealthy: true })),
      isHealthy: true,
      substrateChain: null,
      isCustom: true,
      explorerUrls: network.blockExplorerUrls || [],
      iconUrls: network.iconUrls || [],
    }

    await chaindataProvider.addCustomEvmNetwork(newNetwork)
    if (newToken) await chaindataProvider.addCustomToken(newToken)

    talismanAnalytics.captureDelayed("add network evm", {
      network: network.chainName,
      isCustom: false,
    })

    resolve(null)

    return true
  }

  private ethNetworkUpsert: MessageHandler<"pri(eth.networks.upsert)"> = async (network) => {
    await chaindataProvider.transaction("rw", ["evmNetworks", "tokens"], async () => {
      const existingNetwork = await chaindataProvider.getEvmNetwork(network.id)
      const existingToken = existingNetwork?.nativeToken?.id
        ? await chaindataProvider.getToken(existingNetwork.nativeToken.id)
        : null

      const newToken: CustomEvmNativeToken = {
        id: evmNativeTokenId(network.id, network.tokenSymbol),
        type: "evm-native",
        decimals: network.tokenDecimals,
        symbol: network.tokenSymbol,
        coingeckoId: network.tokenCoingeckoId ?? "",
        evmNetwork: { id: network.id },
        isTestnet: network.isTestnet,
        isCustom: true,
        logo: network.tokenLogoUrl ?? githubUnknownTokenLogoUrl,
        chain: existingToken?.chain,
      }

      const newNetwork: CustomEvmNetwork = {
        // EvmNetwork
        id: network.id,
        name: network.name,
        isTestnet: network.isTestnet,
        sortIndex: existingNetwork?.sortIndex ?? null,
        logo: network.chainLogoUrl ?? null,
        explorerUrl: network.blockExplorerUrl ?? null,
        isHealthy: true,
        nativeToken: { id: newToken.id },
        rpcs: network.rpcs.map(({ url }) => ({ url, isHealthy: true })),
        tokens: existingNetwork?.tokens ?? [],
        substrateChain: existingNetwork?.substrateChain ?? null,
        // CustomEvmNetwork
        isCustom: true,
        iconUrls: [],
        explorerUrls: network.blockExplorerUrl ? [network.blockExplorerUrl] : [],
      }

      await chaindataProvider.addCustomToken(newToken)

      // if symbol changed, id is different and previous native token must be deleted
      if (existingToken && existingToken.id !== newToken.id)
        await chaindataProvider.removeToken(existingToken.id)

      await chaindataProvider.addCustomEvmNetwork(newNetwork)

      // RPCs may have changed, clear cache
      chainConnectorEvm.clearRpcProvidersCache(network.id)

      talismanAnalytics.capture(`${existingNetwork ? "update" : "create"} custom network`, {
        networkType: "evm",
        network: network.id.toString(),
      })
    })

    return true
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

      // some dapps set decimals as a string, which breaks balances
      const safeToken = {
        ...token,
        decimals: Number(token.decimals),
      }

      await chaindataProvider.addCustomToken(safeToken)
      talismanAnalytics.captureDelayed("add asset evm", {
        contractAddress: token.contractAddress,
        symbol: token.symbol,
        network: token.evmNetwork,
        isCustom: true,
      })

      resolve(true)

      return true
    }

  private ethRequest: MessageHandler<"pri(eth.request)"> = async ({ chainId, method, params }) => {
    const provider = await getProviderForEvmNetworkId(chainId, { batch: true })
    assert(provider, `No healthy RPCs available for chain ${chainId}`)
    try {
      return await provider.send(method, params as unknown as any[])
    } catch (err) {
      log.error("[ethRequest]", { err })
      // errors raised from batches are raw (number code), errors raised from ethers JsonProvider are wrapped by ethers (text code)
      // throw error as-is so frontend can figure it out on it's own it, while keeping access to underlying error message
      // any component interested in knowing what the error is about should use @core/domains/ethereum/errors helpers
      throw err
    }
  }

  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
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
        return chaindataProvider.hydrateEvmNetworks()

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
