import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import { stripUrl } from "@core/handlers/helpers"
import {
  AnyEthRequest,
  ETH_ERROR_EIP1474_INVALID_INPUT,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  ETH_ERROR_EIP1993_CHAIN_DISCONNECTED,
  ETH_ERROR_EIP1993_DISCONNECTED,
  ETH_ERROR_EIP1993_UNAUTHORIZED,
  ETH_ERROR_EIP1993_USER_REJECTED,
  ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED,
  EthProviderMessage,
  EthProviderRpcError,
  EthRequestArguments,
  EthRequestSignArguments,
  EthRequestSignatures,
} from "@core/injectEth/types"
import { db } from "@core/libs/db"
import { TabsHandler } from "@core/libs/Handler"
import type {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  CustomErc20Token,
  Port,
  RequestAuthorizeTab,
  RequestSignatures,
  RequestTypes,
  ResponseType,
} from "@core/types"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { toBuffer } from "@ethereumjs/util"
import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { ethers, providers } from "ethers"
import { isHexString } from "ethers/lib/utils"

import { filterAccountsByAddresses } from "../accounts/helpers"
import { recoverPersonalSignAddress } from "./helpers"
import { getProviderForEthereumNetwork, getProviderForEvmNetworkId } from "./networksStore"

interface EthAuthorizedSite extends AuthorizedSite {
  ethChainId: number
  ethAddresses: AuthorizedSiteAddresses
}

export class EthTabsHandler extends TabsHandler {
  async getSiteDetails(url: string): Promise<EthAuthorizedSite> {
    const site = await this.stores.sites.getSiteFromUrl(url)
    if (!site || !site.ethChainId || !site.ethAddresses || site.ethAddresses.length === 0)
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)
    return site as EthAuthorizedSite
  }

  async getProvider(url: string): Promise<providers.JsonRpcProvider> {
    const site = await this.getSiteDetails(url)

    if (!site?.ethChainId || !site?.ethAddresses.length)
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)

    const ethereumNetwork = await db.evmNetworks.get(site.ethChainId)
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider)
      throw new EthProviderRpcError(
        `No provider for network ${ethereumNetwork.id} (${ethereumNetwork.name})`,
        ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
      )

    return provider
  }

  async getSigner(url: string): Promise<providers.JsonRpcSigner> {
    const site = await this.getSiteDetails(url)
    const provider = await this.getProvider(url)

    return provider.getSigner(site.ethAddresses[0])
  }

  private async authoriseEth(url: string, request: RequestAuthorizeTab): Promise<boolean> {
    // Expected error codes
    // 4100	Unauthorized	        The requested method and/or account has not been authorized by the user.
    const siteFromUrl = await this.stores.sites.getSiteFromUrl(url)
    if (siteFromUrl?.ethAddresses) {
      if (siteFromUrl.ethAddresses.length) return true //already authorized
      else throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED) //already rejected
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

    //! returning lowercase addresses otherwise address checks for eth_sign or eth_signTypeData will fail in metamask E2E test dapp
    //! I'm afraid this may lead to errors in checksum if this output is validated by dapp : https://eips.ethereum.org/EIPS/eip-55
    //! If so, remove lowercase (and also remove at line 201)
    return filterAccountsByAddresses(accountsObservable.subject.getValue(), site.ethAddresses)
      .filter(({ type }) => type === "ethereum")
      .map(({ address }) => ethers.utils.getAddress(address).toLowerCase())
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
        console.error("Failed to handle accountsChanged", err)
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

    // TODO: Check rpc(s) work before sending request to user
    // TODO: Check that rpc responds with correct chainId before sending request to user
    // TODO: typecheck network object
    await this.state.requestStores.networks.requestAddNetwork(url, network)

    // switch automatically to new chain
    const ethereumNetwork = await db.evmNetworks.get(chainId)
    if (ethereumNetwork) {
      this.stores.sites.updateSite(stripUrl(url), { ethChainId: chainId })
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
    const chainId = parseInt(hexChainId, 16)

    if (ethers.utils.hexValue(chainId) !== hexChainId)
      throw new EthProviderRpcError("Malformed chainId", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const ethereumNetwork = await db.evmNetworks.get(chainId)
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED)

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    this.stores.sites.updateSite(stripUrl(url), { ethChainId: chainId })

    return null
  }

  private getChainId = async (url: string) => {
    const site = await this.stores.sites.get(stripUrl(url))
    return site?.ethChainId ?? DEFAULT_ETH_CHAIN_ID
  }

  private async getFallbackRequest<K extends keyof EthRequestSignatures>(
    url: string,
    request: EthRequestArguments<K>
  ): Promise<unknown> {
    const provider = await this.getProvider(url)
    const result = await provider.send(request.method, request.params as unknown as any[])
    // eslint-disable-next-line no-console
    console.debug(request.method, request.params, result)
    return result
  }

  private signMessage = async (url: string, request: EthRequestSignArguments) => {
    const { params, method } = request as EthRequestSignArguments

    // expect [message, address] or [address, message]
    const isAddressFirst = typeof params[0] === "string" && ethers.utils.isAddress(params[0])
    const from = (isAddressFirst ? params[0] : params[1]) as string
    const uncheckedMessage = isAddressFirst ? params[1] : params[0]

    // message is either a raw string, a hex string or an array of typed objects
    // normalize the message, it must be stored unencoded in the request to be displayed to the user
    const message =
      typeof uncheckedMessage === "string"
        ? isHexString(uncheckedMessage)
          ? toBuffer(uncheckedMessage).toString("utf-8")
          : uncheckedMessage
        : JSON.stringify(uncheckedMessage)

    const site = await this.getSiteDetails(url)
    try {
      await this.getProvider(url)
    } catch (error) {
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)
    }
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
    const { symbol, address, decimals, image } = request.params.options

    const ethChainId = await this.getChainId(url)
    const tokenId = `${ethChainId}-erc20-${address}`

    const existing = await db.tokens.get(tokenId)
    if (existing)
      throw new EthProviderRpcError("Asset already exists", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const provider = await getProviderForEvmNetworkId(ethChainId)
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    try {
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

  private async ethRequest<TEthMessageType extends keyof EthRequestSignatures>(
    id: string,
    url: string,
    request: EthRequestArguments<TEthMessageType>
  ): Promise<unknown> {
    // eslint-disable-next-line no-console
    console.debug("ethRequest handler", request)

    try {
      // some sites expect eth_accounts to return an empty array if not connected/authorized.
      // if length === 0 they'll request authorization
      // so it should not raise an error if not authorized yet
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
        await this.stores.sites.ensureUrlAuthorized(url, true)
    } catch (err) {
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)
    }

    switch (request.method) {
      case "eth_requestAccounts":
        // error will be thrown by authorizeEth if user rejects
        await this.authoriseEth(url, { origin: "", ethereum: true })
        // TODO understand why site store isn't up to date already
        // wait for site store to update
        await new Promise((resolve) => setTimeout(resolve, 500))
        return await this.accountsList(url)

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

        const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(params[0])
        const provider = await this.getProvider(url)
        const result = await provider.estimateGas(req)
        return result.toHexString()
      }

      // case "eth_sign": // dangerous, obsolete, main use case is phishing => don't support
      // case "eth_signTypedData": // obsolete and cannot support because polkadot ethereum keypairs force a keccak hash before signing, this prevents us to get the expected signature
      // case "eth_signTypedData_v1": // same as above
      case "personal_sign":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        return this.signMessage(url, request as EthRequestSignArguments)
      }

      case "personal_ecRecover": {
        const {
          params: [data, signature],
        } = request as EthRequestArguments<"personal_ecRecover">
        return recoverPersonalSignAddress(data, signature)
      }

      case "eth_sendTransaction": {
        const {
          params: [txRequest],
        } = request as EthRequestArguments<"eth_sendTransaction">

        const site = await this.getSiteDetails(url)

        let provider
        try {
          provider = await this.getProvider(url)
        } catch (error) {
          throw new EthProviderRpcError(
            "Network not supported",
            ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
          )
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
        // TODO unsubscribe
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
