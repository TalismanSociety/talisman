import { personalSign, signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { isEthereumAddress } from "@talismn/crypto"
import { DEBUG } from "extension-shared"
import { bytesToHex } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { talismanAnalytics } from "../../libs/Analytics"
import { ExtensionHandler } from "../../libs/Handler"
import { requestStore } from "../../libs/requests/store"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import { MessageHandler, MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { urlToDomain } from "../../util/urlToDomain"
import { getHostName } from "../app/helpers"
import { activeNetworksStore } from "../balances/store.activeNetworks"
import { activeTokensStore } from "../balances/store.activeTokens"
import { customChaindataStore } from "../chaindata/store.customChaindata"
import { withSecretKey } from "../keyring/withSecretKey"
import { watchEthereumTransaction } from "../transactions"
import { getHumanReadableErrorMessage } from "./errors"
import { ETH_ERROR_EIP1993_USER_REJECTED, EthProviderRpcError } from "./EthProviderRpcError"
import { parseTransactionRequest } from "./helpers"
import { getTransactionCount, incrementTransactionCount } from "./transactionCountManager"

export class EthHandler extends ExtensionHandler {
  private signAndSendApproveHardware: MessageHandler<"pri(eth.signing.approveSignAndSendHardware)"> =
    async ({ id, unsigned, signedPayload }) => {
      try {
        const queued = requestStore.getRequest(id)
        assert(queued, "Unable to find request")

        const { method, resolve, ethChainId } = queued

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

        const { val: host, ok } = getHostName(queued.url)

        talismanAnalytics.captureDelayed("sign transaction approve", {
          method,
          hostName: ok ? host : null,
          dapp: queued.url,
          chain: Number(ethChainId),
          networkType: "ethereum",
          hardwareType: "ledger", // atm ledger is the only type of hardware account that we support for evm
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

    const result = await withSecretKey(account.address, async (secretKey) => {
      const client = await chainConnectorEvm.getWalletClientForEvmNetwork(ethChainId)
      assert(client, "Missing client for chain " + ethChainId)

      const privateKey = bytesToHex(secretKey)
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
    txInfo,
  }) => {
    assert(evmNetworkId, "chainId is not defined")

    const client = await chainConnectorEvm.getWalletClientForEvmNetwork(evmNetworkId)
    assert(client, "Missing client for chain " + evmNetworkId)

    try {
      const hash = await client.sendRawTransaction({ serializedTransaction: signed })

      watchEthereumTransaction(evmNetworkId, hash, unsigned, {
        notifications: true,
        txInfo,
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
    txInfo,
  }) => {
    assert(evmNetworkId, "chainId is not defined")
    assert(unsigned.from, "from is not defined")

    const result = await withSecretKey(unsigned.from, async (secretKey) => {
      const client = await chainConnectorEvm.getWalletClientForEvmNetwork(evmNetworkId)
      assert(client, "Missing client for chain " + evmNetworkId)

      const privateKey = bytesToHex(secretKey)
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
        txInfo,
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

    const { method, resolve, url } = queued

    resolve(signedPayload)

    const { ok, val: host } = getHostName(url)
    talismanAnalytics.captureDelayed("sign approve", {
      method,
      isHardware: true,
      hostName: ok ? host : null,
      dapp: url,
      chain: Number(queued.ethChainId),
      networkType: "ethereum",
      hardwareType: "ledger",
    })

    return true
  }

  private signApprove: MessageHandler<"pri(eth.signing.approveSign)"> = async ({ id }) => {
    const queued = requestStore.getRequest(id)

    assert(queued, "Unable to find request")

    const { method, request, reject, resolve, url } = queued

    const { val, ok } = await withSecretKey(queued.account.address, async (secretKey) => {
      const pw = await this.stores.password.getPassword()
      assert(pw, "Unauthorised")

      const privateKey = Buffer.from(secretKey)
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
  }) => {
    const queued = requestStore.getRequest(id)
    assert(queued, "Unable to find request")
    const { url, network, nativeToken, resolve } = queued

    const known = await chaindataProvider.getNetworkById(network.id, "ethereum")
    if (!known) {
      await customChaindataStore.upsertNetwork(network, nativeToken)

      talismanAnalytics.captureDelayed("add network evm", {
        network: network.name,
        isCustom: true,
      })
    }

    await activeTokensStore.setActive(network.nativeTokenId, true)
    await activeNetworksStore.setActive(network.id, true)

    // associate the network with the dapp that requested it
    const { err, val } = urlToDomain(url)
    if (err) throw new Error(val)
    await this.stores.sites.updateSite(val, { ethChainId: Number(network.id) })

    resolve(null)
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

      const knownToken = await chaindataProvider.getTokenById(token.id)
      if (!knownToken) await customChaindataStore.upsertToken(token)

      await activeTokensStore.setActive(token.id, true)

      talismanAnalytics.captureDelayed("add asset evm", {
        contractAddress: token.contractAddress,
        symbol: token.symbol,
        network: token.networkId,
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
    port: Port,
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
          request as RequestTypes["pri(eth.signing.approveSignAndSend)"],
        )

      case "pri(eth.signing.approveSign)":
        return this.signApprove(request as RequestTypes["pri(eth.signing.approveSign)"])

      case "pri(eth.signing.approveSignHardware)":
        return this.signApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignHardware)"],
        )

      case "pri(eth.signing.approveSignAndSendHardware)":
        return this.signAndSendApproveHardware(
          request as RequestTypes["pri(eth.signing.approveSignAndSendHardware)"],
        )

      case "pri(eth.signing.cancel)":
        return this.signingCancel(request as RequestTypes["pri(eth.signing.cancel)"])

      // --------------------------------------------------------------------
      // ethereum watch asset requests handlers -----------------------------
      // --------------------------------------------------------------------
      case "pri(eth.watchasset.requests.cancel)":
        return this.ethWatchAssetRequestCancel(
          request as RequestTypes["pri(eth.watchasset.requests.cancel)"],
        )

      case "pri(eth.watchasset.requests.approve)":
        return this.ethWatchAssetRequestApprove(
          request as RequestTypes["pri(eth.watchasset.requests.approve)"],
        )

      // --------------------------------------------------------------------
      // ethereum network handlers ------------------------------------------
      // --------------------------------------------------------------------
      case "pri(eth.networks.add.cancel)":
        return this.ethNetworkAddCancel(request as RequestTypes["pri(eth.networks.add.cancel)"])

      case "pri(eth.networks.add.approve)":
        return this.ethNetworkAddApprove(request as RequestTypes["pri(eth.networks.add.approve)"])

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
