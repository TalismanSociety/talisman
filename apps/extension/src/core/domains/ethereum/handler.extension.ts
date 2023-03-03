import { DEBUG } from "@core/constants"
import type {
  AnyEthRequestChainId,
  EthApproveSignAndSend,
  EthRequestSigningApproveSignature,
  WatchAssetRequestIdOnly,
} from "@core/domains/ethereum/types"
import { ETH_NETWORK_ADD_PREFIX, WATCH_ASSET_PREFIX } from "@core/domains/ethereum/types"
import type { KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import { CustomEvmNativeToken } from "@core/domains/tokens/types"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import {
  ETH_ERROR_EIP1993_USER_REJECTED,
  EthProviderRpcError,
} from "@core/injectEth/EthProviderRpcError"
import { EthRequestArguments, EthRequestSignatures } from "@core/injectEth/types"
import { talismanAnalytics } from "@core/libs/Analytics"
import { ExtensionHandler } from "@core/libs/Handler"
import { requestStore } from "@core/libs/requests/store"
import { log } from "@core/log"
import { watchEthereumTransaction } from "@core/notifications"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { SignTypedDataVersion, personalSign, signTypedData } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { evmNativeTokenId } from "@talismn/balances-evm-native"
import { CustomEvmNetwork, githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { ethers } from "ethers"

import { getHumanReadableErrorMessage } from "./errors"
import { rebuildTransactionRequestNumbers } from "./helpers"
import { getProviderForEvmNetworkId } from "./rpcProviders"
import { getTransactionCount, incrementTransactionCount } from "./transactionCountManager"
import { AddEthereumChainRequestIdOnly, RequestUpsertCustomEvmNetwork } from "./types"

export class EthHandler extends ExtensionHandler {
  private async signAndSendApproveHardware({
    id,
    signedPayload,
  }: EthRequestSigningApproveSignature<"eth-send">): Promise<boolean> {
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

      incrementTransactionCount(from, chainId.toString())

      // notify user about transaction progress
      if (await this.stores.settings.get("allowNotifications"))
        watchEthereumTransaction(chainId.toString(), hash)

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

  private async signAndSendApprove({ id, transaction }: EthApproveSignAndSend): Promise<boolean> {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")
    const { resolve, reject, ethChainId, account, url } = queued

    const provider = await getProviderForEvmNetworkId(ethChainId)
    assert(provider, "Unable to find provider for chain " + ethChainId)

    // rebuild BigNumber property values (converted to json when serialized)
    const tx = rebuildTransactionRequestNumbers(transaction)
    tx.nonce = await getTransactionCount(account.address, ethChainId)

    const { val, ok } = await getPairForAddressSafely(account.address, async (pair) => {
      const password = this.stores.password.getPassword()
      assert(password, "Unauthorised")
      const privateKey = getPrivateKey(pair, password)
      const signer = new ethers.Wallet(privateKey, provider)

      const { chainId, hash } = await signer.sendTransaction(tx)

      incrementTransactionCount(account.address, ethChainId)

      // notify user about transaction progress
      if (await this.stores.settings.get("allowNotifications"))
        watchEthereumTransaction(chainId.toString(), hash)

      resolve(hash)

      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        dapp: url,
        chain: ethChainId,
        networkType: "ethereum",
      })
      return true
    })

    if (ok) {
      return val
    } else {
      if (val === "Unauthorised") {
        reject(Error(val))
      } else {
        throw new Error(getHumanReadableErrorMessage(val) ?? "Failed to send transaction")
      }
      return false
    }
  }

  private signApproveHardware({
    id,
    signedPayload,
  }: EthRequestSigningApproveSignature<"eth-sign">): boolean {
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

  private async signApprove({ id }: KnownSigningRequestIdOnly<"eth-sign">): Promise<boolean> {
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

  private signingCancel({ id }: KnownSigningRequestIdOnly<"eth-send" | "eth-sign">): boolean {
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

  private ethNetworkAddCancel({ id }: AddEthereumChainRequestIdOnly): boolean {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethNetworkAddApprove({ id }: AddEthereumChainRequestIdOnly): Promise<boolean> {
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

  private async ethNetworkUpsert(network: RequestUpsertCustomEvmNetwork): Promise<boolean> {
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

  private async ethNetworkRemove(request: RequestIdOnly): Promise<boolean> {
    await chaindataProvider.removeCustomEvmNetwork(request.id)

    talismanAnalytics.capture("remove custom network", {
      networkType: "evm",
      network: request.id,
    })

    chainConnectorEvm.clearRpcProvidersCache(request.id)

    return true
  }

  private async ethNetworkReset(request: RequestIdOnly): Promise<boolean> {
    await chaindataProvider.resetEvmNetwork(request.id)

    talismanAnalytics.capture("reset custom network", {
      networkType: "evm",
      network: request.id,
    })

    chainConnectorEvm.clearRpcProvidersCache(request.id)

    return true
  }

  private ethWatchAssetRequestCancel({ id }: WatchAssetRequestIdOnly): boolean {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethWatchAssetRequestApprove({ id }: WatchAssetRequestIdOnly): Promise<boolean> {
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

  private async ethRequest<TEthMessageType extends keyof EthRequestSignatures>(
    id: string,
    chainId: string,
    request: EthRequestArguments<TEthMessageType>
  ): Promise<unknown> {
    const provider = await getProviderForEvmNetworkId(chainId, { batch: true })
    assert(provider, `No healthy RPCs available for chain ${chainId}`)
    try {
      return await provider.send(request.method, request.params as unknown as any[])
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
      case "pri(eth.signing.approveSignAndSend)":
        return this.signAndSendApprove(request as EthApproveSignAndSend)

      case "pri(eth.signing.approveSign)":
        return this.signApprove(request as KnownSigningRequestIdOnly<"eth-sign">)

      case "pri(eth.signing.approveSignHardware)":
        return this.signApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignHardware)"]
        )

      case "pri(eth.signing.approveSignAndSendHardware)":
        return this.signAndSendApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignAndSendHardware)"]
        )

      case "pri(eth.signing.cancel)":
        return this.signingCancel(request as KnownSigningRequestIdOnly<"eth-send" | "eth-sign">)

      // --------------------------------------------------------------------
      // ethereum watch asset requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.watchasset.requests.cancel)":
        return this.ethWatchAssetRequestCancel(request as WatchAssetRequestIdOnly)

      case "pri(eth.watchasset.requests.approve)":
        return this.ethWatchAssetRequestApprove(request as WatchAssetRequestIdOnly)

      case "pri(eth.watchasset.requests.subscribe)":
        return requestStore.subscribe<"pri(eth.watchasset.requests.subscribe)">(id, port, [
          WATCH_ASSET_PREFIX,
        ])

      case "pri(eth.watchasset.requests.subscribe.byid)": {
        const cb = createSubscription<"pri(eth.watchasset.requests.subscribe.byid)">(id, port)
        const subscription = requestStore.observable.subscribe((reqs) => {
          const watchAssetRequest = reqs.find(
            (req) => req.id === (request as WatchAssetRequestIdOnly).id
          )
          if (watchAssetRequest && watchAssetRequest.type === WATCH_ASSET_PREFIX)
            cb(watchAssetRequest)
        })

        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          subscription.unsubscribe()
        })
        return true
      }

      // --------------------------------------------------------------------
      // ethereum network handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(eth.networks.add.cancel)":
        return this.ethNetworkAddCancel(request as AddEthereumChainRequestIdOnly)

      case "pri(eth.networks.add.approve)":
        return this.ethNetworkAddApprove(request as AddEthereumChainRequestIdOnly)

      case "pri(eth.networks.add.requests)":
        return requestStore.getAllRequests(ETH_NETWORK_ADD_PREFIX)

      case "pri(eth.networks.add.subscribe)":
        return requestStore.subscribe<"pri(eth.networks.add.subscribe)">(id, port, [
          ETH_NETWORK_ADD_PREFIX,
        ])

      case "pri(eth.networks.subscribe)":
        return chaindataProvider.hydrateEvmNetworks()

      case "pri(eth.networks.upsert)":
        return this.ethNetworkUpsert(request as RequestTypes["pri(eth.networks.upsert)"])

      case "pri(eth.transactions.count)": {
        const { address, evmNetworkId } = request as RequestTypes["pri(eth.transactions.count)"]
        return getTransactionCount(address, evmNetworkId)
      }

      case "pri(eth.networks.remove)":
        return this.ethNetworkRemove(request as RequestTypes["pri(eth.networks.remove)"])

      case "pri(eth.networks.reset)":
        return this.ethNetworkReset(request as RequestTypes["pri(eth.networks.reset)"])

      case "pri(eth.request)": {
        const { chainId: ethChainId, ...rest } = request as AnyEthRequestChainId
        return this.ethRequest(id, ethChainId, rest) as any
      }
    }
    throw new Error(`Unable to handle message of type ${type}`)
  }
}
