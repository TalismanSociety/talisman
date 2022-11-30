import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  RequestAuthorizeTab,
} from "@core/domains/sitesAuthorised/types"
import { CustomErc20Token } from "@core/domains/tokens/types"
import { urlToDomain } from "@core/util/urlToDomain"
import {
  AnyEthRequest,
  EthProviderMessage,
  EthRequestArguments,
  EthRequestSignArguments,
  EthRequestSignatures,
} from "@core/injectEth/types"
import {
  ETH_ERROR_EIP1474_INVALID_INPUT,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  ETH_ERROR_EIP1993_CHAIN_DISCONNECTED,
  ETH_ERROR_EIP1993_DISCONNECTED,
  ETH_ERROR_EIP1993_UNAUTHORIZED,
  ETH_ERROR_EIP1993_USER_REJECTED,
  ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED,
  EthProviderRpcError,
} from "@core/injectEth/EthProviderRpcError"
import { db } from "@core/libs/db"
import { TabsHandler } from "@core/libs/Handler"
import type { RequestSignatures, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { sleep } from "@core/util/sleep"
import { recoverPersonalSignature } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ethers, providers } from "ethers"
import { throwAfter } from "talisman-utils"

import { filterAccountsByAddresses } from "../accounts/helpers"
import {
  getErc20TokenId,
  isValidAddEthereumRequestParam,
  isValidWatchAssetRequestParam,
} from "./helpers"
import { getProviderForEthereumNetwork, getProviderForEvmNetworkId } from "./rpcProviders"
import { convertAddress } from "@talisman/util/convertAddress"
import { log } from "@core/log"
import { assert } from "@polkadot/util"

interface EthAuthorizedSite extends AuthorizedSite {
  ethChainId: number
  ethAddresses: AuthorizedSiteAddresses
}

export class EthTabsHandler extends TabsHandler {
  private async checkAccountAuthorised(url: string, address?: string) {
    try {
      await this.stores.sites.ensureUrlAuthorized(url, true, address)
    } catch (err) {
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)
    }
  }

  async getSiteDetails(url: string, authorisedAddress?: string): Promise<EthAuthorizedSite> {
    const site = await this.stores.sites.getSiteFromUrl(url)
    if (
      !site ||
      !site.ethChainId ||
      (authorisedAddress && !site.ethAddresses?.includes(convertAddress(authorisedAddress, null)))
    )
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)
    return site as EthAuthorizedSite
  }

  async getProvider(url: string, authorisedAddress?: string): Promise<providers.JsonRpcProvider> {
    const site = await this.getSiteDetails(url, authorisedAddress)

    const ethereumNetwork = await db.evmNetworks.get(site.ethChainId)
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const provider = await getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider)
      throw new EthProviderRpcError(
        `No provider for network ${ethereumNetwork.id} (${ethereumNetwork.name})`,
        ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
      )

    return provider
  }

  private async authoriseEth(url: string, request: RequestAuthorizeTab): Promise<boolean> {
    const siteFromUrl = await this.stores.sites.getSiteFromUrl(url)
    if (siteFromUrl?.ethAddresses) {
      if (siteFromUrl.ethAddresses.length) return true //already authorized
      else throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED) //already rejected : 4100	Unauthorized
    }

    try {
      return await this.state.requestStores.sites.requestAuthorizeUrl(url, request)
    } catch (err) {
      // 4001	User Rejected Request	The user rejected the request.
      throw new EthProviderRpcError("User Rejected Request", ETH_ERROR_EIP1993_USER_REJECTED)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async accountsList(url: string): Promise<string[]> {
    const site = await this.stores.sites.getSiteFromUrl(url)
    if (!site) return []

    // case is used for checksum when validating user input addresses : https://eips.ethereum.org/EIPS/eip-55
    // signature checks methods return lowercase addresses too and are compared to addresses returned by provider
    // => we have to return addresses as lowercase too
    return (
      filterAccountsByAddresses(accountsObservable.subject.getValue(), site.ethAddresses)
        .filter(({ type }) => type === "ethereum")
        // send as
        .map(({ address }) => ethers.utils.getAddress(address).toLowerCase())
    )
  }

  private async ethSubscribe(id: string, url: string, port: Port): Promise<boolean> {
    // settings that are specific to a tab
    let siteId: string
    let chainId: string | undefined
    let accounts: AuthorizedSiteAddresses | undefined
    let connected: boolean

    const sendToClient = (message: EthProviderMessage) => {
      try {
        port.postMessage({ id, subscription: message })
      } catch (e) {
        if (e instanceof Error) {
          if (e.message === "Attempting to use a disconnected port object") {
            // this means that the user has done something like close the tab
            port.disconnect()
            return
          }
        }
        throw e
      }
    }

    const init = () =>
      this.stores.sites.getSiteFromUrl(url).then(async (site) => {
        try {
          if (!site) return
          siteId = site.id
          if (site.ethChainId && site.ethAddresses?.length) {
            chainId =
              typeof site?.ethChainId !== "undefined"
                ? ethers.utils.hexValue(site.ethChainId)
                : undefined
            accounts = site.ethAddresses

            // check that the network is still registered before broadcasting
            connected = !!(await this.getProvider(url))

            if (connected) {
              sendToClient({ type: "connect", data: { chainId } })
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to initialize eth subscription", err)
        }
      })

    // eager connect, should work for sites already authorized
    // await promise or sites observable handler won't be ready
    await init()

    const { unsubscribe } = this.stores.sites.observable.subscribe(async (sites) => {
      const site = sites[siteId]

      // old state for this dapp
      const prevChainId = chainId
      const prevAccounts = accounts
      const prevConnected = connected

      try {
        // new state for this dapp
        chainId =
          typeof site?.ethChainId !== "undefined"
            ? ethers.utils.hexValue(site.ethChainId)
            : undefined
        //TODO check eth addresses still exist
        accounts = site?.ethAddresses ?? []
        // checking the existence of an associated provider also checks that network is still authorized
        connected = !!(await this.getProvider(url))

        if (typeof siteId === "undefined") {
          // user may just have authorized, try to reinitialize
          return await init()
        }

        // compare old and new state and emit corresponding events
        if (prevConnected && !connected)
          sendToClient({
            type: "disconnect",
            data: {
              code: chainId ? ETH_ERROR_EIP1993_CHAIN_DISCONNECTED : ETH_ERROR_EIP1993_DISCONNECTED,
            },
          })

        if (!prevConnected && connected) {
          sendToClient({ type: "connect", data: { chainId } })
        } else if (connected && prevChainId !== chainId) {
          sendToClient({ type: "chainChanged", data: chainId })
        }

        if (connected && chainId && prevAccounts?.join() !== accounts.join()) {
          sendToClient({
            type: "accountsChanged",
            data: accounts.map((ac) => ethers.utils.getAddress(ac).toLowerCase()),
          })
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("site subscription callback error", { err })
      }
    })

    // unsubscribe if port disconnects (usually when tab closes)
    const handleDisconnect = () => {
      try {
        // by the time this is called, the subscription may already be closed which will raise an error
        unsubscribe()
      } catch (e) {
        if (
          !(
            e instanceof TypeError &&
            e.message === "Cannot read properties of undefined (reading 'closed')"
          )
        )
          throw e
      }
      port.onDisconnect.removeListener(handleDisconnect)
    }
    port.onDisconnect.addListener(handleDisconnect)

    return true
  }

  private addEthereumChain = async (
    url: string,
    request: EthRequestArguments<"wallet_addEthereumChain">
  ) => {
    const {
      params: [network],
    } = request

    const chainId = parseInt(network.chainId, 16)
    const existing = await db.evmNetworks.get(chainId)
    // some dapps (ex app.solarbeam.io) call this method without attempting to call wallet_switchEthereumChain first
    // in case network is already registered, dapp expects that we switch to it
    if (existing)
      return this.switchEthereumChain(url, {
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      })

    // type check payload
    if (!isValidAddEthereumRequestParam(network))
      throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)

    // check that the RPC exists and has the correct chain id
    if (!network.rpcUrls.length)
      throw new EthProviderRpcError("Missing rpcUrls", ETH_ERROR_EIP1474_INVALID_PARAMS)

    await Promise.all(
      network.rpcUrls.map(async (rpcUrl) => {
        try {
          const provider = new providers.JsonRpcProvider(rpcUrl)
          const providerChainIdHex: string = await Promise.race([
            provider.send("eth_chainId", []),
            throwAfter(10_000, "timeout"), // 10 sec timeout
          ])
          const providerChainId = parseInt(providerChainIdHex, 16)

          assert(providerChainId === chainId, "chainId mismatch")
        } catch (err) {
          log.error({ err })
          throw new EthProviderRpcError("Invalid rpc " + rpcUrl, ETH_ERROR_EIP1474_INVALID_PARAMS)
        }
      })
    )

    await this.state.requestStores.networks.requestAddNetwork(url, network)

    // switch automatically to new chain
    const ethereumNetwork = await db.evmNetworks.get(chainId)
    if (ethereumNetwork) {
      const { err, val } = urlToDomain(url)
      if (err) throw new Error(val)
      this.stores.sites.updateSite(val, { ethChainId: chainId })
    }

    return null
  }

  private switchEthereumChain = async (
    url: string,
    request: EthRequestArguments<"wallet_switchEthereumChain">
  ) => {
    const {
      params: [{ chainId: hexChainId }],
    } = request
    if (!hexChainId)
      throw new EthProviderRpcError("Missing chainId", ETH_ERROR_EIP1474_INVALID_PARAMS)
    const ethChainId = parseInt(hexChainId, 16)

    const ethereumNetwork = await db.evmNetworks.get(ethChainId)
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED)

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const { err, val } = urlToDomain(url)
    if (err) throw new Error(val)
    this.stores.sites.updateSite(val, { ethChainId })

    return null
  }

  private getChainId = async (url: string) => {
    // url validation carried out inside stores.sites.getSiteFromUrl
    const site = await this.stores.sites.getSiteFromUrl(url)
    return site?.ethChainId ?? DEFAULT_ETH_CHAIN_ID
  }

  private async getFallbackRequest<K extends keyof EthRequestSignatures>(
    url: string,
    request: EthRequestArguments<K>
  ): Promise<unknown> {
    const provider = await this.getProvider(url)
    return provider.send(request.method, request.params as unknown as any[])
  }

  private signMessage = async (url: string, request: EthRequestSignArguments) => {
    const { params, method } = request as EthRequestSignArguments

    let isMessageFirst = ["personal_sign", "eth_signTypedData", "eth_signTypedData_v1"].includes(
      method
    )
    // on https://astar.network, params are in reverse order
    if (isMessageFirst && isEthereumAddress(params[0]) && !isEthereumAddress(params[1]))
      isMessageFirst = false

    const [uncheckedMessage, from] = isMessageFirst
      ? [params[0], ethers.utils.getAddress(params[1])]
      : [params[1], ethers.utils.getAddress(params[0])]

    // message is either a raw string or a hex string or an object (signTypedData_v1)
    const message =
      typeof uncheckedMessage === "string" ? uncheckedMessage : JSON.stringify(uncheckedMessage)

    const site = await this.getSiteDetails(url, from)

    const address = site.ethAddresses[0]
    const pair = keyring.getPair(address)

    if (!address || !pair || ethers.utils.getAddress(address) !== ethers.utils.getAddress(from)) {
      throw new EthProviderRpcError(
        `No account available for ${url}`,
        ETH_ERROR_EIP1993_UNAUTHORIZED
      )
    }

    return this.state.requestStores.signing.signEth(url, method, message, site.ethChainId, {
      address: ethers.utils.getAddress(address),
      ...pair.meta,
    })
  }

  private addWatchAssetRequest = async (
    url: string,
    request: EthRequestArguments<"wallet_watchAsset">
  ) => {
    if (!isValidWatchAssetRequestParam(request.params))
      throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const { symbol, address, decimals, image } = request.params.options
    const ethChainId = await this.getChainId(url)
    if (!ethChainId)
      throw new EthProviderRpcError("Not connected", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const tokenId = getErc20TokenId(ethChainId, address)
    const existing = await db.tokens.get(tokenId)
    if (existing)
      throw new EthProviderRpcError("Asset already exists", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const provider = await getProviderForEvmNetworkId(ethChainId)
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    try {
      // eslint-disable-next-line no-var
      var tokenInfo = await getErc20TokenInfo(provider, ethChainId, address)
    } catch (err) {
      throw new EthProviderRpcError("Asset not found", ETH_ERROR_EIP1474_INVALID_PARAMS)
    }

    const token: CustomErc20Token = {
      id: tokenId,
      type: "erc20",
      isTestnet: false,
      symbol: symbol ?? tokenInfo.symbol,
      decimals: decimals ?? tokenInfo.decimals,
      coingeckoId: tokenInfo.coingeckoId,
      contractAddress: address,
      evmNetwork: tokenInfo.evmNetworkId !== undefined ? { id: tokenInfo.evmNetworkId } : null,
      isCustom: true,
      image: image ?? tokenInfo.image,
    }

    return this.state.requestStores.evmAssets.requestWatchAsset(url, request.params, token)
  }

  private async sendTransaction(url: string, request: EthRequestArguments<"eth_sendTransaction">) {
    const {
      params: [txRequest],
    } = request as EthRequestArguments<"eth_sendTransaction">

    const site = await this.getSiteDetails(url, txRequest.from)

    // ensure chainId isn't an hex (ex: Zerion)
    if (typeof txRequest.chainId === "string" && (txRequest.chainId as string).startsWith("0x"))
      txRequest.chainId = parseInt(txRequest.chainId, 16)

    // checks that the request targets currently selected network
    if (txRequest.chainId && site.ethChainId !== txRequest.chainId)
      throw new EthProviderRpcError("Wrong network", ETH_ERROR_EIP1474_INVALID_PARAMS)

    try {
      await this.getProvider(url, txRequest.from)
    } catch (error) {
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)
    }

    const address = site.ethAddresses[0]

    // allow only the currently selected account in "from" field
    if (txRequest.from?.toLowerCase() !== address.toLowerCase())
      throw new EthProviderRpcError("Unknown from account", ETH_ERROR_EIP1474_INVALID_INPUT)

    const pair = keyring.getPair(address)

    if (!address || !pair) {
      throw new EthProviderRpcError(
        `No account available for ${url}`,
        ETH_ERROR_EIP1993_UNAUTHORIZED
      )
    }

    return this.state.requestStores.signing.signAndSendEth(
      url,
      {
        // locks the chainId in case the dapp's chainId changes after signing request creation
        chainId: site.ethChainId,
        ...txRequest,
      },
      site.ethChainId,
      {
        address,
        ...pair.meta,
      }
    )
  }

  private async ethRequest<TEthMessageType extends keyof EthRequestSignatures>(
    id: string,
    url: string,
    request: EthRequestArguments<TEthMessageType>
  ): Promise<unknown> {
    if (
      ![
        "eth_requestAccounts",
        "eth_accounts",
        "eth_chainId",
        "net_version",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
        "wallet_watchAsset",
      ].includes(request.method)
    )
      await this.checkAccountAuthorised(url)

    switch (request.method) {
      case "eth_requestAccounts":
        // error will be thrown by authorizeEth if user rejects
        await this.authoriseEth(url, { origin: "", ethereum: true })
        return this.accountsList(url)

      case "eth_accounts":
        // public method, no need to auth (returns empty array if not authorized yet)
        return this.accountsList(url)

      case "eth_chainId":
        // public method, no need to auth (returns undefined if not authorized yet)
        return ethers.utils.hexValue(await this.getChainId(url))

      case "net_version":
        // public method, no need to auth (returns undefined if not authorized yet)
        // legacy, but still used by etherscan prior calling eth_watchAsset
        return (await this.getChainId(url)).toString()

      case "estimateGas": {
        const { params } = request as EthRequestArguments<"estimateGas">
        if (params[1] && params[1] !== "latest") {
          throw new EthProviderRpcError(
            "estimateGas does not support blockTag",
            ETH_ERROR_EIP1474_INVALID_PARAMS
          )
        }

        await this.checkAccountAuthorised(url, params[0].from)

        const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params[0])
        const provider = await this.getProvider(url)
        const result = await provider.estimateGas(req)
        return result.toHexString()
      }

      case "personal_sign":
      case "eth_signTypedData":
      case "eth_signTypedData_v1":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        return this.signMessage(url, request as EthRequestSignArguments)
      }

      case "personal_ecRecover": {
        const {
          params: [data, signature],
        } = request as EthRequestArguments<"personal_ecRecover">
        return recoverPersonalSignature({ data, signature })
      }

      case "eth_sendTransaction":
        return this.sendTransaction(url, request as EthRequestArguments<"eth_sendTransaction">)

      case "wallet_watchAsset":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addWatchAssetRequest(url, request as EthRequestArguments<"wallet_watchAsset">)

      case "wallet_addEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addEthereumChain(url, request as EthRequestArguments<"wallet_addEthereumChain">)

      case "wallet_switchEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.switchEthereumChain(
          url,
          request as EthRequestArguments<"wallet_switchEthereumChain">
        )

      default:
        return this.getFallbackRequest(url, request)
    }
  }

  handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case "pub(eth.subscribe)":
        return this.ethSubscribe(id, url, port)

      case "pub(eth.request)":
        return this.ethRequest(id, url, request as AnyEthRequest) as any

      case "pub(eth.mimicMetaMask)":
        return this.stores.settings.get("shouldMimicMetaMask")

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
