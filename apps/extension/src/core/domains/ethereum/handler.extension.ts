import { DEBUG } from "@core/constants"
import {
  AnyEthRequestChainId,
  CustomEvmNetwork,
  EthApproveSignAndSend,
  EthRequestSigningApproveSignature,
  EvmNetwork,
  WatchAssetRequest,
} from "@core/domains/ethereum/types"
import { CustomNativeToken } from "@core/domains/tokens/types"
import { getPairForAddressSafely } from "@core/handlers/helpers"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import {
  EthProviderRpcError,
  ETH_ERROR_EIP1993_USER_REJECTED,
} from "@core/injectEth/EthProviderRpcError"
import { EthRequestArguments, EthRequestSignatures } from "@core/injectEth/types"
import { talismanAnalytics } from "@core/libs/Analytics"
import { db } from "@core/libs/db"
import { ExtensionHandler } from "@core/libs/Handler"
import { watchEthereumTransaction } from "@core/notifications"
import { MessageTypes, RequestTypes, ResponseType } from "@core/types"
import { Port, RequestIdOnly } from "@core/types/base"
import { getPrivateKey } from "@core/util/getPrivateKey"
import { graphqlUrl } from "@core/util/graphql"
import { SignTypedDataVersion, personalSign, signTypedData } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { assert } from "@polkadot/util"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import { isDefined } from "@ui/util/isDefined"
import { ethers } from "ethers"
import { print } from "graphql"
import { tokensQuery, tokensResponseToTokenList } from "../tokens/store"

import { rebuildTransactionRequestNumbers } from "./helpers"
import { evmNetworksQuery } from "./networksStore"
import { getProviderForEvmNetworkId, clearEvmRpcProviderCache } from "./rpcProviders"
import { getTransactionCount, incrementTransactionCount } from "./transactionCountManager"
import { RequestUpsertCustomEvmNetwork } from "./types/base"

// turns errors into short and human readable message.
// main use case is teling the user why a transaction failed without going into details and clutter the UI
const getHumanReadableErrorMessage = (error: unknown) => {
  const {
    code,
    reason,
    error: serverError,
  } = error as { code?: string; reason?: string; error?: any }

  if (serverError) {
    const message = serverError?.reason ?? serverError?.message
    return message
      .replace("VM Exception while processing transaction: revert", "")
      .replace("VM Exception while processing transaction:", "")
      .trim()
  }

  if (reason === "processing response error") return "Invalid transaction"

  if (reason) return reason
  if (code === ethers.errors.INSUFFICIENT_FUNDS) return "Insufficient balance"
  if (code === ethers.errors.CALL_EXCEPTION) return "Contract method failed"
  if (code === ethers.errors.NETWORK_ERROR) return "Network error"
  if (code === ethers.errors.NONCE_EXPIRED) return "Nonce expired"
  if (code === ethers.errors.UNSUPPORTED_OPERATION) return "Unsupported operation"
  if (code === ethers.errors.NOT_IMPLEMENTED) return "Not implemented"
  if (code === ethers.errors.TIMEOUT) return "Timeout exceeded"
  if (code === ethers.errors.UNEXPECTED_ARGUMENT) return "Unexpected argument"
  if (code === ethers.errors.BUFFER_OVERRUN) return "Buffer overrun"
  if (code === ethers.errors.MISSING_ARGUMENT) return "Missing argument"
  if (code === ethers.errors.UNEXPECTED_ARGUMENT) return "Unexpected argument"
  if (code === ethers.errors.INVALID_ARGUMENT) return "Invalid argument"
  if (code === ethers.errors.SERVER_ERROR) return "Server error"

  // let the catch block decide what to display
  return undefined
}

export class EthHandler extends ExtensionHandler {
  private async signAndSendApproveHardware({
    id,
    signedPayload,
  }: EthRequestSigningApproveSignature): Promise<boolean> {
    try {
      const queued = this.state.requestStores.signing.getEthSignAndSendRequest(id)
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

      incrementTransactionCount(from, chainId)

      // notify user about transaction progress
      if (await this.stores.settings.get("allowNotifications"))
        watchEthereumTransaction(chainId, hash)

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
    const queued = this.state.requestStores.signing.getEthSignAndSendRequest(id)
    assert(queued, "Unable to find request")
    const { resolve, reject, ethChainId, account, url } = queued

    const provider = await getProviderForEvmNetworkId(ethChainId)
    assert(provider, "Unable to find provider for chain " + ethChainId)

    // rebuild BigNumber property values (converted to json when serialized)
    const tx = rebuildTransactionRequestNumbers(transaction)
    tx.nonce = await getTransactionCount(account.address, ethChainId)

    const result = await getPairForAddressSafely(account.address, async (pair) => {
      const password = await this.stores.password.getPassword()
      assert(password, "Unauthorised")
      const privateKey = getPrivateKey(pair, password)
      const signer = new ethers.Wallet(privateKey, provider)

      const { chainId, hash } = await signer.sendTransaction(tx)

      incrementTransactionCount(account.address, ethChainId)

      // notify user about transaction progress
      if (await this.stores.settings.get("allowNotifications"))
        watchEthereumTransaction(chainId, hash)

      resolve(hash)

      talismanAnalytics.captureDelayed("sign transaction approve", {
        type: "evm sign and send",
        dapp: url,
        chain: ethChainId,
        networkType: "ethereum",
      })
      return true
    })

    if (result.ok) {
      return result.val
    } else {
      if (result.val === "Unauthorised") {
        reject(Error(result.val))
      } else {
        throw new Error(getHumanReadableErrorMessage(result.val) ?? "Failed to send transaction")
      }
      return false
    }
  }

  private signApproveHardware({ id, signedPayload }: EthRequestSigningApproveSignature): boolean {
    const queued = this.state.requestStores.signing.getEthSignRequest(id)

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

  private async signApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.signing.getEthSignRequest(id)

    assert(queued, "Unable to find request")

    const { method, request, reject, resolve } = queued

    const result = await getPairForAddressSafely(queued.account.address, async (pair) => {
      const pw = await this.stores.password.getPassword()
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

    if (result.ok) return result.val
    else {
      if (result.val === "Unauthorised") {
        reject(Error(result.val))
      } else {
        const msg = getHumanReadableErrorMessage(result.val)
        if (msg) throw new Error(msg)
        else result.unwrap() // throws error
      }
      return false
    }
  }

  private signingCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.signing.getEthRequest(id)

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

  private ethNetworkAddCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.networks.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethNetworkAddApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.networks.getRequest(id)

    assert(queued, "Unable to find request")

    const { network, resolve } = queued
    const networkId = parseInt(network.chainId, 16)
    const newToken: CustomNativeToken | null = network.nativeCurrency
      ? {
          id: `${networkId}-native-${network.nativeCurrency.symbol}`.toLowerCase(),
          type: "native",
          isTestnet: false,
          symbol: network.nativeCurrency.symbol,
          decimals: network.nativeCurrency.decimals,
          existentialDeposit: "0",
          evmNetwork: { id: parseInt(network.chainId, 16) },
          isCustom: true,
        }
      : null

    const newNetwork: CustomEvmNetwork = {
      id: networkId,
      isTestnet: false,
      sortIndex: null,
      name: network.chainName,
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

    await db.transaction("rw", db.evmNetworks, db.tokens, async () => {
      await db.evmNetworks.put(newNetwork)
      if (newToken) await db.tokens.put(newToken)
    })

    talismanAnalytics.captureDelayed("add network evm", {
      network: network.chainName,
      isCustom: false,
    })

    resolve(null)

    return true
  }

  private async ethNetworkUpsert(network: RequestUpsertCustomEvmNetwork): Promise<boolean> {
    await db.transaction("rw", db.evmNetworks, db.tokens, async (tx) => {
      const nativeTokenId = `${network.id}-native-${network.tokenSymbol}`.toLowerCase()

      // allow overriding all networks, including talisman-defined ones
      const existing = await db.evmNetworks.get(network.id)

      //if symbol changed, previous native token must be deleted
      if (existing?.nativeToken && existing.nativeToken.id !== nativeTokenId)
        await db.tokens.delete(existing.nativeToken.id)

      // ensure native token exists
      await db.tokens.put({
        id: nativeTokenId,
        type: "native",
        isTestnet: false,
        symbol: network.tokenSymbol,
        decimals: network.tokenDecimals,
        existentialDeposit: "0",
        evmNetwork: { id: network.id },
        isCustom: true,
      })

      // upsert the network itself
      await db.evmNetworks.put({
        id: network.id,
        isTestnet: network.isTestnet,
        sortIndex: null,
        name: network.name,
        nativeToken: { id: nativeTokenId },
        tokens: existing?.tokens ?? [],
        explorerUrl: network.blockExplorerUrl ?? null,
        rpcs: [{ url: network.rpc, isHealthy: true }],
        isHealthy: true,
        substrateChain: existing?.substrateChain ?? null,
        isCustom: true,
        explorerUrls: [network.blockExplorerUrl].filter(isDefined),
      })

      talismanAnalytics.captureDelayed("add network evm", {
        network: network.name,
        isCustom: true,
      })
    })

    clearEvmRpcProviderCache(network.id)

    return true
  }

  private async ethNetworkRemove(request: RequestIdOnly): Promise<boolean> {
    const id = parseInt(request.id)

    const evmNetwork = await db.evmNetworks.get(id)
    assert(evmNetwork, "Could not find network " + id)
    assert(isCustomEvmNetwork(evmNetwork), "Only custom networks may be removed")

    await db.transaction("rw", db.evmNetworks, db.tokens, async () => {
      await db.tokens.filter((t) => "evmNetwork" in t && t.evmNetwork?.id === id).delete()
      await db.evmNetworks.delete(id)
    })

    clearEvmRpcProviderCache(id)

    return true
  }

  private async ethNetworkReset(request: RequestIdOnly): Promise<boolean> {
    const id = parseInt(request.id)

    const evmNetwork = await db.evmNetworks.get(id)
    assert(evmNetwork, "Could not find network " + id)
    assert(isCustomEvmNetwork(evmNetwork), "Network has not been customized")

    // TODO post balances merge, move this to a function in networks store

    const { data: dataNetworks } = await (
      await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: print(evmNetworksQuery) }),
      }).catch(() => {
        throw new Error("Failed to fetch Talisman networks")
      })
    )
      .json()
      .catch(() => {
        throw new Error("Failed to load Talisman networks")
      })

    const { data: dataTokens } = await (
      await fetch(graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: print(tokensQuery) }),
      })
    ).json()

    const defaultEvmNetwork = dataNetworks?.evmNetworks?.find(
      (n: EvmNetwork) => Number(n.id) === id
    )
    assert(defaultEvmNetwork, "Could not find network")

    const tokensList = tokensResponseToTokenList(dataTokens?.tokens ?? [])
    const defaultNativeToken = Object.values(tokensList).find(
      (t) => t.type === "native" && "evmNetwork" in t && Number(t.evmNetwork?.id) === id
    )
    assert(defaultNativeToken, "Could not find native token")

    await db.transaction("rw", db.tokens, db.evmNetworks, async () => {
      // recreate native token
      await db.tokens
        .filter((t) => t.type === "native" && "evmNetwork" in t && Number(t.evmNetwork?.id) === id)
        .delete()
      await db.tokens.put(defaultNativeToken)

      // overwrite network
      await db.evmNetworks.put({
        ...defaultEvmNetwork,
        id: Number(defaultEvmNetwork.id),
      })
    })

    clearEvmRpcProviderCache(id)

    return true
  }

  private ethWatchAssetRequestCancel({ id }: RequestIdOnly): boolean {
    const queued = this.state.requestStores.evmAssets.getRequest(id)

    assert(queued, "Unable to find request")

    const { reject } = queued

    reject(new EthProviderRpcError("Rejected", ETH_ERROR_EIP1993_USER_REJECTED))

    return true
  }

  private async ethWatchAssetRequestApprove({ id }: RequestIdOnly): Promise<boolean> {
    const queued = this.state.requestStores.evmAssets.getRequest(id)

    assert(queued, "Unable to find request")
    const { resolve, token } = queued

    // some dapps set decimals as a string, which breaks balances
    const safeToken = {
      ...token,
      decimals: Number(token.decimals),
    }

    await db.tokens.put(safeToken)
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
    chainId: number,
    request: EthRequestArguments<TEthMessageType>
  ): Promise<unknown> {
    const provider = await getProviderForEvmNetworkId(chainId)
    assert(provider, `No healthy RPCs available for provider for chain ${chainId}`)
    try {
      return await provider.send(request.method, request.params as unknown as any[])
    } catch (err) {
      const msg = getHumanReadableErrorMessage(err)
      throw new Error(msg ?? (err as Error)?.message)
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

      case "pri(eth.signing.approveSignAndSendHardware)":
        return this.signAndSendApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignAndSendHardware)"]
        )

      case "pri(eth.signing.approveSign)":
        return this.signApprove(request as RequestIdOnly)

      case "pri(eth.signing.approveSignHardware)":
        return this.signApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignHardware)"]
        )

      case "pri(eth.signing.cancel)":
        return this.signingCancel(request as RequestIdOnly)

      // --------------------------------------------------------------------
      // ethereum watch asset requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.watchasset.requests.cancel)":
        return this.ethWatchAssetRequestCancel(request as RequestIdOnly)

      case "pri(eth.watchasset.requests.approve)":
        return this.ethWatchAssetRequestApprove(request as RequestIdOnly)

      case "pri(eth.watchasset.requests.subscribe)":
        return this.state.requestStores.evmAssets.subscribe<"pri(eth.watchasset.requests.subscribe)">(
          id,
          port
        )

      case "pri(eth.watchasset.requests.subscribe.byid)": {
        const cb = createSubscription<"pri(eth.watchasset.requests.subscribe.byid)">(id, port)
        const subscription = this.state.requestStores.evmAssets.observable.subscribe(
          (reqs: WatchAssetRequest[]) => {
            const watchAssetRequest = reqs.find((req) => req.id === (request as RequestIdOnly).id)
            if (watchAssetRequest) cb(watchAssetRequest)
          }
        )

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
        return this.ethNetworkAddCancel(request as RequestIdOnly)

      case "pri(eth.networks.add.approve)":
        return this.ethNetworkAddApprove(request as RequestIdOnly)

      case "pri(eth.networks.add.requests)":
        return this.state.requestStores.networks.getAllRequests()

      case "pri(eth.networks.add.subscribe)":
        return this.state.requestStores.networks.subscribe<"pri(eth.networks.add.subscribe)">(
          id,
          port
        )

      case "pri(eth.networks.subscribe)":
        return this.stores.evmNetworks.hydrateStore()

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
