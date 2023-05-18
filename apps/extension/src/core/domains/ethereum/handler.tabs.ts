import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import { filterAccountsByAddresses, getPublicAccounts } from "@core/domains/accounts/helpers"
import { signAndSendEth, signEth } from "@core/domains/signing/requests"
import {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  EthWalletPermissions,
  RequestAuthorizeTab,
} from "@core/domains/sitesAuthorised/types"
import { CustomErc20Token } from "@core/domains/tokens/types"
import {
  ETH_ERROR_EIP1474_INVALID_INPUT,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  ETH_ERROR_EIP1474_RESOURCE_UNAVAILABLE,
  ETH_ERROR_EIP1993_CHAIN_DISCONNECTED,
  ETH_ERROR_EIP1993_DISCONNECTED,
  ETH_ERROR_EIP1993_UNAUTHORIZED,
  ETH_ERROR_EIP1993_USER_REJECTED,
  ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED,
  EthProviderRpcError,
} from "@core/injectEth/EthProviderRpcError"
import {
  AnyEthRequest,
  EthProviderMessage,
  EthRequestArguments,
  EthRequestSignArguments,
  EthRequestSignatures,
} from "@core/injectEth/types"
import { TabsHandler } from "@core/libs/Handler"
import { log } from "@core/log"
import { chaindataProvider } from "@core/rpcs/chaindata"
import type { RequestSignatures, RequestTypes, ResponseType } from "@core/types"
import { Port } from "@core/types/base"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { urlToDomain } from "@core/util/urlToDomain"
import { recoverPersonalSignature } from "@metamask/eth-sig-util"
import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { throwAfter } from "@talismn/util"
import { ethers, providers } from "ethers"

import {
  ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE,
  requestAuthoriseSite,
} from "../sitesAuthorised/requests"
import {
  getErc20TokenId,
  isValidAddEthereumRequestParam,
  isValidRequestedPermissions,
  isValidWatchAssetRequestParam,
} from "./helpers"
import { requestAddNetwork, requestWatchAsset } from "./requests"
import { getProviderForEthereumNetwork, getProviderForEvmNetworkId } from "./rpcProviders"
import { Web3WalletPermission, Web3WalletPermissionTarget } from "./types"

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
    let site

    try {
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch (err) {
      // no-op, will throw below
    }
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

    const ethereumNetwork = await chaindataProvider.getEvmNetwork(site.ethChainId.toString())
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider)
      throw new EthProviderRpcError(
        `No provider for network ${ethereumNetwork.id} (${ethereumNetwork.name})`,
        ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
      )

    return provider
  }

  private async authoriseEth(
    url: string,
    request: RequestAuthorizeTab,
    port: Port
  ): Promise<boolean> {
    let siteFromUrl
    try {
      siteFromUrl = await this.stores.sites.getSiteFromUrl(url)
    } catch (err) {
      return false
    }
    if (siteFromUrl?.ethAddresses) {
      if (siteFromUrl.ethAddresses.length) return true //already authorized
      else throw new EthProviderRpcError("Unauthorized", ETH_ERROR_EIP1993_UNAUTHORIZED) //already rejected : 4100	Unauthorized
    }

    try {
      await requestAuthoriseSite(url, request, port)
      return true
    } catch (err) {
      // throw specific error in case of duplicate auth request
      const error = err as Error
      if (error.message === ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE)
        throw new EthProviderRpcError(error.message, ETH_ERROR_EIP1474_RESOURCE_UNAVAILABLE)

      // 4001	User Rejected Request	The user rejected the request.
      throw new EthProviderRpcError("User Rejected Request", ETH_ERROR_EIP1993_USER_REJECTED)
    }
  }

  private async accountsList(url: string): Promise<string[]> {
    let site
    try {
      site = await this.stores.sites.getSiteFromUrl(url)
      if (!site) return []
    } catch (err) {
      return []
    }

    // case is used for checksum when validating user input addresses : https://eips.ethereum.org/EIPS/eip-55
    // signature checks methods return lowercase addresses too and are compared to addresses returned by provider
    // => we have to return addresses as lowercase too
    return (
      getPublicAccounts(
        Object.values(accountsObservable.subject.getValue()),
        filterAccountsByAddresses(site.ethAddresses)
      )
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
      this.stores.sites
        .getSiteFromUrl(url)
        .then(async (site) => {
          try {
            if (!site) return
            siteId = site.id
            if (site.ethChainId && site.ethAddresses?.length) {
              chainId =
                typeof site?.ethChainId !== "undefined"
                  ? ethers.utils.hexValue(site.ethChainId)
                  : undefined
              accounts = site.ethAddresses ?? []

              // check that the network is still registered before broadcasting
              connected = !!accounts.length

              if (connected) {
                sendToClient({ type: "accountsChanged", data: accounts })
                sendToClient({ type: "connect", data: { chainId } })
              }
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("Failed to initialize eth subscription", err)
          }
        })
        .catch((error) => {
          // most likely error will be url invalid, no-op for that, re-throw anything else
          if (!["URL protocol unsupported", "Invalid URL"].includes(error.message)) throw error
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
        connected = !!accounts.length

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
    request: EthRequestArguments<"wallet_addEthereumChain">,
    port: Port
  ) => {
    const {
      params: [network],
    } = request

    const chainId = parseInt(network.chainId, 16)
    const existing = await chaindataProvider.getEvmNetwork(chainId.toString())
    // some dapps (ex app.solarbeam.io) call this method without attempting to call wallet_switchEthereumChain first
    // in case network is already registered, dapp expects that we switch to it
    if (existing)
      return this.switchEthereumChain(url, {
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      })

    // on some dapps (ex: https://app.pangolin.exchange/), iconUrls is a string instead of an array
    if (typeof network.iconUrls === "string") network.iconUrls = [network.iconUrls]

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

    await requestAddNetwork(url, network, port)

    // switch automatically to new chain
    const ethereumNetwork = await chaindataProvider.getEvmNetwork(chainId.toString())
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

    const ethereumNetwork = await chaindataProvider.getEvmNetwork(ethChainId.toString())
    if (!ethereumNetwork)
      throw new EthProviderRpcError(
        `Unknown network ${ethChainId}, try adding the chain using wallet_addEthereumChain first`,
        ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED
      )

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider)
      throw new EthProviderRpcError(
        `Failed to connect to network ${ethChainId}`,
        ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
      )

    const { err, val } = urlToDomain(url)
    if (err) throw new Error(val)
    this.stores.sites.updateSite(val, { ethChainId })

    return null
  }

  private getChainId = async (url: string) => {
    let site
    try {
      // url validation carried out inside stores.sites.getSiteFromUrl
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch (error) {
      //no-op
    }
    return site?.ethChainId ?? DEFAULT_ETH_CHAIN_ID
  }

  private async getFallbackRequest<K extends keyof EthRequestSignatures>(
    url: string,
    request: EthRequestArguments<K>
  ): Promise<unknown> {
    // obtain the chain id without checking auth.
    // note: this method is only called if method doesn't require auth, or if auth is already checked
    const chainId = await this.getChainId(url)

    const ethereumNetwork = await chaindataProvider.getEvmNetwork(chainId.toString())
    if (!ethereumNetwork)
      throw new EthProviderRpcError(
        `Unknown network ${chainId}`,
        ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED
      )

    const provider = await getProviderForEthereumNetwork(ethereumNetwork, { batch: true })
    if (!provider)
      throw new EthProviderRpcError(
        `Failed to connect to network ${chainId}`,
        ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
      )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return provider.send(request.method, request.params as unknown as any[])
  }

  private signMessage = async (url: string, request: EthRequestSignArguments, port: Port) => {
    const { params, method } = request as EthRequestSignArguments

    // eth_signTypedData requires a non-empty array of parameters, else throw (uniswap will then call v4)
    if (method === "eth_signTypedData") {
      if (!Array.isArray(params[0]))
        throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)
    }

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

    return signEth(
      url,
      method,
      message,
      site.ethChainId.toString(),
      {
        address: ethers.utils.getAddress(address),
        ...pair.meta,
      },
      port
    )
  }

  private addWatchAssetRequest = async (
    url: string,
    request: EthRequestArguments<"wallet_watchAsset">,
    port: Port
  ) => {
    if (!isValidWatchAssetRequestParam(request.params))
      throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const { symbol, address, decimals, image } = request.params.options
    const ethChainId = await this.getChainId(url)
    if (typeof ethChainId !== "number")
      throw new EthProviderRpcError("Not connected", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const tokenId = getErc20TokenId(ethChainId.toString(), address)
    const existing = await chaindataProvider.getToken(tokenId)
    if (existing)
      throw new EthProviderRpcError("Asset already exists", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const provider = await getProviderForEvmNetworkId(ethChainId.toString())
    if (!provider)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    try {
      // eslint-disable-next-line no-var
      var tokenInfo = await getErc20TokenInfo(provider, ethChainId.toString(), address)
    } catch (err) {
      throw new EthProviderRpcError("Asset not found", ETH_ERROR_EIP1474_INVALID_PARAMS)
    }

    const token: CustomErc20Token = {
      id: tokenId,
      type: "evm-erc20",
      isTestnet: false,
      symbol: symbol ?? tokenInfo.symbol,
      decimals: decimals ?? tokenInfo.decimals,
      logo: image ?? tokenInfo.image ?? githubUnknownTokenLogoUrl,
      coingeckoId: tokenInfo.coingeckoId,
      contractAddress: address,
      evmNetwork: tokenInfo.evmNetworkId !== undefined ? { id: tokenInfo.evmNetworkId } : null,
      isCustom: true,
      image: image ?? tokenInfo.image,
    }

    return requestWatchAsset(url, request.params, token, port)
  }

  private async sendTransaction(
    url: string,
    request: EthRequestArguments<"eth_sendTransaction">,
    port: Port
  ) {
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

    return signAndSendEth(
      url,
      {
        // locks the chainId in case the dapp's chainId changes after signing request creation
        chainId: site.ethChainId,
        ...txRequest,
      },
      site.ethChainId.toString(),
      {
        address,
        ...pair.meta,
      },
      port
    )
  }

  private async getPermissions(url: string): Promise<Web3WalletPermission[]> {
    let site
    try {
      // url validation carried out inside stores.sites.getSiteFromUrl
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch (error) {
      //no-op
    }

    return site?.ethPermissions
      ? Object.entries(site.ethPermissions).reduce<Web3WalletPermission[]>(
          (permissions, [parentCapability, otherProps]) =>
            permissions.concat({ parentCapability, ...otherProps } as Web3WalletPermission),
          []
        )
      : []
  }

  private async requestPermissions(
    url: string,
    request: EthRequestArguments<"wallet_requestPermissions">,
    port: Port
  ): Promise<Web3WalletPermission[]> {
    if (request.params.length !== 1)
      throw new EthProviderRpcError(
        "This method expects an array with only 1 entry",
        ETH_ERROR_EIP1474_INVALID_PARAMS
      )

    const [requestedPerms] = request.params
    if (!isValidRequestedPermissions(requestedPerms))
      throw new EthProviderRpcError("Invalid permissions", ETH_ERROR_EIP1474_INVALID_PARAMS)

    // identify which permissions are currently missing
    let site
    try {
      // url validation carried out inside stores.sites.getSiteFromUrl
      site = await this.stores.sites.getSiteFromUrl(url)
    } catch (error) {
      return []
    }

    const existingPerms = site?.ethPermissions ?? ({} as EthWalletPermissions)
    const missingPerms = Object.keys(requestedPerms)
      .map((perm) => perm as Web3WalletPermissionTarget)
      .filter((perm) => !existingPerms[perm])

    // request all missing permissions to the user
    // for now we only support eth_accounts, which we consider granted when user authenticates
    // @dev: cannot proceed with a loop here as order may have some importance, and we may want to group multiple permissions in a single request
    const grantedPermissions: Partial<EthWalletPermissions> = {}
    if (missingPerms.includes("eth_accounts")) {
      await this.authoriseEth(url, { origin: "", ethereum: true }, port)
      grantedPermissions.eth_accounts = { date: new Date().getTime() }
    }

    // if any, store missing permissions
    if (Object.keys(grantedPermissions).length) {
      // fetch site again as it might have been created/updated while authenticating (eth_accounts permission)
      // no need to handle URL invalid error this time as we know the URL is ok
      const siteAgain = await this.stores.sites.getSiteFromUrl(url)
      if (!siteAgain) throw new EthProviderRpcError("Unauthorised", ETH_ERROR_EIP1993_UNAUTHORIZED)

      const ethPermissions = {
        ...(siteAgain.ethPermissions ?? {}),
        ...grantedPermissions,
      } as EthWalletPermissions

      await this.stores.sites.updateSite(siteAgain.id, { ethPermissions })
    }

    return this.getPermissions(url)
  }

  private async ethRequest<TEthMessageType extends keyof EthRequestSignatures>(
    id: string,
    url: string,
    request: EthRequestArguments<TEthMessageType>,
    port: Port
  ): Promise<unknown> {
    if (
      ![
        "eth_requestAccounts",
        "eth_accounts",
        "eth_chainId",
        "eth_blockNumber",
        "net_version",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
        "wallet_watchAsset",
        "wallet_requestPermissions",
      ].includes(request.method)
    )
      await this.checkAccountAuthorised(url)

    switch (request.method) {
      case "eth_requestAccounts":
        await this.requestPermissions(
          url,
          {
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          },
          port
        )
        return this.accountsList(url)

      case "eth_accounts":
        // public method, no need to auth (returns empty array if not authorized yet)
        return this.accountsList(url)

      case "eth_coinbase": {
        const accounts = await this.accountsList(url)
        return accounts[0] ?? null
      }

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
        return this.signMessage(url, request as EthRequestSignArguments, port)
      }

      case "personal_ecRecover": {
        const {
          params: [data, signature],
        } = request as EthRequestArguments<"personal_ecRecover">
        return recoverPersonalSignature({ data, signature })
      }

      case "eth_sendTransaction":
        return this.sendTransaction(
          url,
          request as EthRequestArguments<"eth_sendTransaction">,
          port
        )

      case "wallet_watchAsset":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addWatchAssetRequest(
          url,
          request as EthRequestArguments<"wallet_watchAsset">,
          port
        )

      case "wallet_addEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addEthereumChain(
          url,
          request as EthRequestArguments<"wallet_addEthereumChain">,
          port
        )

      case "wallet_switchEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.switchEthereumChain(
          url,
          request as EthRequestArguments<"wallet_switchEthereumChain">
        )

      // https://docs.metamask.io/guide/rpc-api.html#wallet-getpermissions
      case "wallet_getPermissions":
        return this.getPermissions(url)

      // https://docs.metamask.io/guide/rpc-api.html#wallet-requestpermissions
      case "wallet_requestPermissions":
        return this.requestPermissions(
          url,
          request as EthRequestArguments<"wallet_requestPermissions">,
          port
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.ethRequest(id, url, request as AnyEthRequest, port) as any

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
