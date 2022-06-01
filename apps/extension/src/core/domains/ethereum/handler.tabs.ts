import type {
  RequestTypes,
  ResponseType,
  RequestSignatures,
  Port,
  RequestAuthorizeTab,
  AuthorizedSiteAddresses,
  AuthorizedSite,
} from "@core/types"

import { TabsHandler } from "@core/libs/Handler"
import {
  EthProviderRpcError,
  EthRequestArguments,
  AnyEthRequest,
  EthRequestSignatures,
  EthProviderMessage,
  ETH_ERROR_EIP1993_CHAIN_DISCONNECTED,
  ETH_ERROR_EIP1993_UNAUTHORIZED,
  ETH_ERROR_EIP1993_USER_REJECTED,
  ETH_ERROR_EIP1993_DISCONNECTED,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED,
} from "@core/injectEth/types"
import { filterAccountsByAddresses } from "../accounts/helpers"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { ethers, providers } from "ethers"
import keyring from "@polkadot/ui-keyring"
import { getProviderForEthereumNetwork } from "./networksStore"
import { assert } from "@polkadot/util"
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

    const ethereumNetwork = await this.stores.ethereumNetworks.ethereumNetwork(site.ethChainId)
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

    // 4001	User Rejected Request	The user rejected the request.
    try {
      return await this.state.requestStores.sites.requestAuthorizeUrl(url, request)
    } catch (err) {
      throw new EthProviderRpcError("User Rejected Request", ETH_ERROR_EIP1993_USER_REJECTED)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async accountsList(url: string): Promise<string[]> {
    const site = await this.stores.sites.getSiteFromUrl(url)
    if (!site) return []

    return filterAccountsByAddresses(accountsObservable.subject.getValue(), site.ethAddresses)
      .filter(({ type }) => type === "ethereum")
      .map(({ address }) => address)
  }

  private async ethSubscribe(id: string, url: string, port: Port): Promise<boolean> {
    // settings that are specific to a tab
    let siteId: string
    let chainId: string | undefined
    let accounts: AuthorizedSiteAddresses | undefined
    let connected: boolean

    const sendToClient = (message: EthProviderMessage) =>
      port.postMessage({ id, subscription: message })

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
          sendToClient({ type: "accountsChanged", data: accounts })
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to handle accountsChanged", err)
      }
    })

    // unsubscribe if port disconnects (usually when tab closes)
    const handleDisconnect = () => {
      unsubscribe()
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
    const existing = await this.stores.ethereumNetworks.ethereumNetwork(chainId)
    // some dapps (ex app.solarbeam.io) call this method without attempting to call wallet_switchEthereumChain first
    // in case network is already registered, dapp expects that we switch to it
    if (existing) {
      // for custom networks, check that rpcs are the same as the registered ones
      // TODO if mismatch, create request to user to override the network?
      if (existing.isCustom && existing.rpcs.join() !== network.rpcUrls.join())
        throw new EthProviderRpcError("Network already exists", ETH_ERROR_EIP1474_INVALID_PARAMS)

      return this.switchEthereumChain(url, {
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      })
    }

    // TODO: Check rpc(s) work before sending request to user
    // TODO: Check that rpc responds with correct chainId before sending request to user
    // TODO : typecheck network object
    await this.state.requestStores.networks.requestAddNetwork(url, network)

    // switch automatically to new chain
    const ethereumNetwork = await this.stores.ethereumNetworks.ethereumNetwork(chainId)
    if (ethereumNetwork) {
      const site = await this.getSiteDetails(url)
      this.stores.sites.updateSite(site.id, { ethChainId: chainId })
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

    const ethereumNetwork = await this.stores.ethereumNetworks.ethereumNetwork(chainId)
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED)

    const provider = getProviderForEthereumNetwork(ethereumNetwork)
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const site = await this.getSiteDetails(url)
    this.stores.sites.updateSite(site.id, { ethChainId: chainId })

    return null
  }

  private getChainId = async (url: string) => {
    try {
      await this.getProvider(url)

      // TODO return value directly from the store to save an RPC call, would need to check with a real call the first time though
      // const site = await this.getSiteDetails(url)
      // return ethers.utils.hexValue(site.ethChainId)

      return this.getFallbackRequest(url, { method: "eth_chainId", params: null })
    } catch (err) {
      // if 4901 most likely the chain has been unregistered from our ethereum network store
      // returning undefined here should indicate client that network has to be added again
      if ((err as EthProviderRpcError)?.code === ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)
        return undefined

      // otherwise throw
      throw err
    }
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

  private signMessage = async (url: string, request: EthRequestArguments<"eth_sign">) => {
    const { params } = request as EthRequestArguments<"eth_sign">

    // expect [message, address] or [address, message]
    const isAddressFirst = ethers.utils.isAddress(params[0])
    const from = isAddressFirst ? params[0] : params[1]
    const uncheckedMessage = isAddressFirst ? params[1] : params[0]

    // message is either a raw string or a hex string
    // normalize the message, it must be stored unencoded in the request to be displayed to the user
    const message = ethers.utils.isHexString(uncheckedMessage)
      ? ethers.utils.toUtf8String(uncheckedMessage)
      : uncheckedMessage

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

    return this.state.requestStores.signing.signEth(url, message, site.ethChainId, {
      address: ethers.utils.getAddress(address),
      ...pair.meta,
    })
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
      if (!["eth_requestAccounts", "eth_accounts", "eth_chainId"].includes(request.method))
        await this.stores.sites.ensureUrlAuthorized(url, true)
    } catch (err) {
      throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED)
    }

    switch (request.method) {
      case "eth_requestAccounts":
        // error will be thrown by authorizeEth if not authorised
        await this.authoriseEth(url, { origin: "", ethereum: true })
        // TODO understand why site store isn't up to date already
        // wait for site store to update
        await new Promise((resolve) => setTimeout(resolve, 500))
        return await this.accountsList(url)
      case "eth_accounts":
        return await this.accountsList(url)

      case "eth_chainId":
        await this.authoriseEth(url, { origin: "", ethereum: true })
        const chain = await this.getChainId(url)
        console.log({ chain })
        return chain

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

      case "personal_sign":
      case "eth_sign": {
        return this.signMessage(url, request as EthRequestArguments<"eth_sign">)
      }

      case "eth_getBlockByHash":
      case "eth_getBlockByNumber": {
        const {
          params: [blockTag, withTransactions],
        } = request as EthRequestArguments<"eth_getBlockByHash">
        const provider = await this.getProvider(url)
        if (withTransactions) {
          return await provider.getBlockWithTransactions(blockTag)
        }
        return await provider.getBlock(blockTag)
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
          provider,
          site.ethChainId,
          {
            address,
            ...pair.meta,
          }
        )
      }

      case "wallet_watchAsset":
        console.log("got wallet_watchAsset", request)
        // check for duplicate
        const { symbol } = (request as EthRequestArguments<"wallet_watchAsset">).params.options

        const { ethChainId } = await this.getSiteDetails(url)
        const tokenId = `${ethChainId}-${symbol}`
        const existing = this.stores.evmAssets.get(tokenId)
        assert(!existing, "Token already present in Talisman")

        return this.state.requestStores.evmAssets.requestWatchAsset(
          url,
          (request as EthRequestArguments<"wallet_watchAsset">).params
        )

      case "wallet_addEthereumChain":
        return this.addEthereumChain(url, request as EthRequestArguments<"wallet_addEthereumChain">)

      case "wallet_switchEthereumChain":
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
        return this.ethRequest(id, url, request as AnyEthRequest)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
