import keyring from "@polkadot/ui-keyring"
import { accounts as accountsObservable } from "@polkadot/ui-keyring/observable/accounts"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { CustomEvmErc20Token, evmErc20TokenId } from "@talismn/balances"
import { githubUnknownTokenLogoUrl } from "@talismn/chaindata-provider"
import { convertAddress, throwAfter } from "@talismn/util"
import { DEFAULT_ETH_CHAIN_ID, log } from "extension-shared"
import i18next from "i18next"
import {
  PublicClient,
  RpcError,
  createClient,
  getAddress,
  http,
  recoverMessageAddress,
  toHex,
} from "viem"
import { hexToNumber, isHex } from "viem/utils"

import { TabsHandler } from "../../libs/Handler"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import { chaindataProvider } from "../../rpcs/chaindata"
import type { RequestSignatures, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { getErc20TokenInfo } from "../../util/getErc20TokenInfo"
import { urlToDomain } from "../../util/urlToDomain"
import { filterAccountsByAddresses, getPublicAccounts } from "../accounts/helpers"
import { TalismanNotOnboardedError } from "../app/utils"
import { signAndSendEth, signEth } from "../signing/requests"
import {
  ERROR_DUPLICATE_AUTH_REQUEST_MESSAGE,
  requestAuthoriseSite,
} from "../sitesAuthorised/requests"
import {
  AuthorizedSite,
  AuthorizedSiteAddresses,
  EthWalletPermissions,
  RequestAuthorizeTab,
} from "../sitesAuthorised/types"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import { getEvmErrorCause } from "./errors"
import {
  ETH_ERROR_EIP1474_INTERNAL_ERROR,
  ETH_ERROR_EIP1474_INVALID_INPUT,
  ETH_ERROR_EIP1474_INVALID_PARAMS,
  ETH_ERROR_EIP1474_RESOURCE_UNAVAILABLE,
  ETH_ERROR_EIP1993_CHAIN_DISCONNECTED,
  ETH_ERROR_EIP1993_DISCONNECTED,
  ETH_ERROR_EIP1993_UNAUTHORIZED,
  ETH_ERROR_EIP1993_USER_REJECTED,
  ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED,
  EthProviderRpcError,
} from "./EthProviderRpcError"
import {
  isValidAddEthereumRequestParam,
  isValidRequestedPermissions,
  isValidWatchAssetRequestParam,
  sanitizeWatchAssetRequestParam,
} from "./helpers"
import { requestAddNetwork, requestWatchAsset } from "./requests"
import { activeEvmNetworksStore, isEvmNetworkActive } from "./store.activeEvmNetworks"
import {
  AnyEthRequest,
  AnyEvmError,
  EthProviderMessage,
  EthRequestArgs,
  EthRequestArguments,
  EthRequestResult,
  EthRequestSignArguments,
  Web3WalletPermission,
  Web3WalletPermissionTarget,
} from "./types"

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

  private async getSiteDetails(
    url: string,
    authorisedAddress?: string
  ): Promise<EthAuthorizedSite> {
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

  private async getPublicClient(url: string, authorisedAddress?: string): Promise<PublicClient> {
    const site = await this.getSiteDetails(url, authorisedAddress)

    const ethereumNetwork = await chaindataProvider.evmNetworkById(site.ethChainId.toString())
    if (!ethereumNetwork)
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

    const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(ethereumNetwork.id)
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
        .map(({ address }) => getAddress(address).toLowerCase())
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
              chainId = site?.ethChainId !== undefined ? toHex(site.ethChainId) : undefined
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
        chainId = site?.ethChainId !== undefined ? toHex(site.ethChainId) : undefined
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
            data: accounts.map((ac) => getAddress(ac).toLowerCase()),
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
  ): Promise<EthRequestResult<"wallet_addEthereumChain">> => {
    const {
      params: [network],
    } = request

    const chainId = parseInt(network.chainId, 16)
    const existing = await chaindataProvider.evmNetworkById(chainId.toString())
    const activeNetworks = await activeEvmNetworksStore.get()
    // some dapps (ex app.solarbeam.io) call this method without attempting to call wallet_switchEthereumChain first
    // in case network is already registered, dapp expects that we switch to it
    if (existing && isEvmNetworkActive(existing, activeNetworks))
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
          const client = createClient({ transport: http(rpcUrl, { retryCount: 1 }) })
          const rpcChainIdHex = await Promise.race([
            client.request({ method: "eth_chainId" }),
            throwAfter(10_000, "timeout"), // 10 sec timeout
          ])
          assert(!!rpcChainIdHex, `No chainId returned for ${rpcUrl}`)
          const rpcChainId = hexToNumber(rpcChainIdHex)

          assert(rpcChainId === chainId, "chainId mismatch")
        } catch (err) {
          log.error({ err })
          throw new EthProviderRpcError("Invalid rpc " + rpcUrl, ETH_ERROR_EIP1474_INVALID_PARAMS)
        }
      })
    )

    await requestAddNetwork(url, network, port)

    // switch automatically to new chain
    const ethereumNetwork = await chaindataProvider.evmNetworkById(chainId.toString())
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
  ): Promise<EthRequestResult<"wallet_switchEthereumChain">> => {
    const {
      params: [{ chainId: hexChainId }],
    } = request
    if (!hexChainId)
      throw new EthProviderRpcError("Missing chainId", ETH_ERROR_EIP1474_INVALID_PARAMS)
    const ethChainId = parseInt(hexChainId, 16)

    const ethereumNetwork = await chaindataProvider.evmNetworkById(ethChainId.toString())
    const activeNetworks = await activeEvmNetworksStore.get()
    if (!ethereumNetwork || !isEvmNetworkActive(ethereumNetwork, activeNetworks))
      throw new EthProviderRpcError(
        `Unknown network ${ethChainId}, try adding the chain using wallet_addEthereumChain first`,
        ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED
      )

    const provider = await chainConnectorEvm.getPublicClientForEvmNetwork(ethereumNetwork.id)
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
    // TODO what to do if default network is disabled ?
    return site?.ethChainId ?? DEFAULT_ETH_CHAIN_ID
  }

  private async getFallbackRequest(url: string, request: AnyEthRequest): Promise<unknown> {
    // obtain the chain id without checking auth.
    // note: this method is only called if method doesn't require auth, or if auth is already checked
    const chainId = await this.getChainId(url)
    const publicClient = await chainConnectorEvm.getPublicClientForEvmNetwork(chainId.toString())

    if (!publicClient)
      throw new EthProviderRpcError(
        `Unknown network ${chainId}`,
        ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED
      )

    return publicClient.request({
      method: request.method as never,
      params: request.params as never,
    })
  }

  private signMessage = async (
    url: string,
    { params, method }: EthRequestSignArguments,
    port: Port
  ) => {
    // eth_signTypedData requires a non-empty array of parameters, else throw (uniswap will then call v4)
    if (method === "eth_signTypedData") {
      if (!Array.isArray(params[0]))
        throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)
    }

    let isMessageFirst = ["personal_sign", "eth_signTypedData", "eth_signTypedData_v1"].includes(
      method
    )
    // on https://astar.network, params are in reverse order
    if (
      typeof params[0] === "string" &&
      isMessageFirst &&
      isEthereumAddress(params[0]) &&
      !isEthereumAddress(params[1])
    )
      isMessageFirst = false

    const [uncheckedMessage, from] = isMessageFirst
      ? [params[0], getAddress(params[1])]
      : [params[1], getAddress(params[0] as string)]

    // message is either a raw string or a hex string or an object (signTypedData_v1)
    const message =
      typeof uncheckedMessage === "string" ? uncheckedMessage : JSON.stringify(uncheckedMessage)

    const site = await this.getSiteDetails(url, from)

    const address = site.ethAddresses[0]
    const pair = keyring.getPair(address)

    if (!address || !pair || getAddress(address) !== getAddress(from)) {
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
        address: getAddress(address),
        ...pair.meta,
      },
      port
    )
  }

  private addWatchAssetRequest = async (
    url: string,
    request: EthRequestArguments<"wallet_watchAsset">,
    port: Port
  ): Promise<EthRequestResult<"wallet_watchAsset">> => {
    if (!isValidWatchAssetRequestParam(request.params))
      throw new EthProviderRpcError("Invalid parameter", ETH_ERROR_EIP1474_INVALID_PARAMS)

    const processRequest = async () => {
      try {
        const {
          options: { symbol, address, decimals, image },
        } = await sanitizeWatchAssetRequestParam(request.params)

        const ethChainId = await this.getChainId(url)
        if (typeof ethChainId !== "number")
          throw new EthProviderRpcError("Not connected", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)

        const tokenId = evmErc20TokenId(ethChainId.toString(), address)
        const existing = await chaindataProvider.tokenById(tokenId)
        if (existing && isTokenActive(existing, await activeTokensStore.get()))
          throw new EthProviderRpcError("Asset already exists", ETH_ERROR_EIP1474_INVALID_PARAMS)

        const client = await chainConnectorEvm.getPublicClientForEvmNetwork(ethChainId.toString())
        if (!client)
          throw new EthProviderRpcError(
            "Network not supported",
            ETH_ERROR_EIP1993_CHAIN_DISCONNECTED
          )

        try {
          // eslint-disable-next-line no-var
          var tokenInfo = await getErc20TokenInfo(client, ethChainId.toString(), address)
        } catch (err) {
          throw new EthProviderRpcError("Asset not found", ETH_ERROR_EIP1474_INVALID_PARAMS)
        }

        const allTokens = await chaindataProvider.tokens()
        const symbolFound = allTokens.some(
          (token) =>
            token.type === "evm-erc20" &&
            token.evmNetwork?.id === ethChainId.toString() &&
            token.symbol === symbol &&
            token.contractAddress.toLowerCase() !== address.toLowerCase()
        )

        const warnings: string[] = []
        if (!tokenInfo) {
          warnings.push(i18next.t("Failed to verify the contract information"))
        } else {
          if (tokenInfo.symbol !== symbol)
            warnings.push(
              i18next.t(
                "Suggested symbol {{symbol}} is different from the one defined on the contract ({{contractSymbol}})",
                { symbol, contractSymbol: tokenInfo.symbol }
              )
            )
          if (!tokenInfo.coingeckoId)
            warnings.push(i18next.t("This token's address is not registered on CoinGecko"))
        }
        if (symbolFound)
          warnings.push(
            i18next.t(`Another {{symbol}} token already exists on this network`, { symbol })
          )

        const token: CustomEvmErc20Token = {
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

        await requestWatchAsset(url, request.params, token, warnings, port)
      } catch (err) {
        log.error("Failed to add watch asset", { err })
      }
    }

    // process request asynchronously to prevent dapp from knowing if user accepts or rejects
    // see https://eips.ethereum.org/EIPS/eip-747
    processRequest()

    return true
  }

  private async sendTransaction(
    url: string,
    { params: [txRequest] }: EthRequestArguments<"eth_sendTransaction">,
    port: Port
  ) {
    const site = await this.getSiteDetails(url, txRequest.from)

    {
      // eventhough not standard, some transactions specify a chainId in the request
      // throw an error if it's not the current tab's chainId
      let specifiedChainId = (txRequest as unknown as { chainId?: string | number }).chainId

      // ensure chainId isn't an hex (ex: Zerion)
      if (isHex(specifiedChainId)) specifiedChainId = hexToNumber(specifiedChainId)

      // checks that the request targets currently selected network
      if (specifiedChainId && Number(site.ethChainId) !== Number(specifiedChainId))
        throw new EthProviderRpcError("Wrong network", ETH_ERROR_EIP1474_INVALID_PARAMS)
    }

    try {
      // ensure that we have a valid provider for the current network
      await this.getPublicClient(url, txRequest.from)
    } catch (error) {
      throw new EthProviderRpcError("Network not supported", ETH_ERROR_EIP1993_CHAIN_DISCONNECTED)
    }

    const address = site.ethAddresses[0]

    // allow only the currently selected account in "from" field
    if (txRequest.from?.toLowerCase() !== address.toLowerCase())
      throw new EthProviderRpcError("Invalid from account", ETH_ERROR_EIP1474_INVALID_INPUT)

    const pair = keyring.getPair(address)

    if (!address || !pair) {
      throw new EthProviderRpcError(
        `No account available for ${url}`,
        ETH_ERROR_EIP1993_UNAUTHORIZED
      )
    }

    return signAndSendEth(
      url,
      txRequest,
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
      // no-op
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
  ): Promise<EthRequestResult<"wallet_requestPermissions">> {
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

  private async ethRequest(
    id: string,
    url: string,
    request: EthRequestArgs,
    port: Port
  ): Promise<unknown> {
    if (
      ![
        "eth_requestAccounts",
        "eth_accounts",
        "eth_chainId", // TODO check if necessary ?
        "eth_blockNumber", // TODO check if necessary ?
        "net_version", // TODO check if necessary ?
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
        "wallet_watchAsset",
        "wallet_requestPermissions",
      ].includes(request.method)
    )
      await this.checkAccountAuthorised(url)

    // TODO typecheck return types against rpc schema
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
        return toHex(await this.getChainId(url))

      case "net_version":
        // public method, no need to auth (returns undefined if not authorized yet)
        // legacy, but still used by etherscan prior calling eth_watchAsset
        return (await this.getChainId(url)).toString()

      case "personal_sign":
      case "eth_signTypedData":
      case "eth_signTypedData_v1":
      case "eth_signTypedData_v3":
      case "eth_signTypedData_v4": {
        return this.signMessage(url, request, port)
      }

      case "personal_ecRecover": {
        const {
          params: [message, signature],
        } = request
        return recoverMessageAddress({ message, signature })
      }

      case "eth_sendTransaction":
        return this.sendTransaction(url, request, port)

      case "wallet_watchAsset":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addWatchAssetRequest(url, request, port)

      case "wallet_addEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.addEthereumChain(url, request, port)

      case "wallet_switchEthereumChain":
        //auth-less test dapp : rsksmart.github.io/metamask-rsk-custom-network/
        return this.switchEthereumChain(url, request)

      // https://docs.metamask.io/guide/rpc-api.html#wallet-getpermissions
      case "wallet_getPermissions":
        return this.getPermissions(url)

      // https://docs.metamask.io/guide/rpc-api.html#wallet-requestpermissions
      case "wallet_requestPermissions":
        return this.requestPermissions(url, request, port)

      default:
        return this.getFallbackRequest(url, request)
    }
  }

  async handle<TMessageType extends keyof RequestSignatures>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
    url: string
  ): Promise<ResponseType<TMessageType>> {
    // Always check for onboarding before doing anything else
    // Because of chrome extensions can be synchronised on multiple computers,
    // Talisman may be installed on computers where user do not want to onboard
    // => Do not trigger onboarding, just throw an error
    try {
      await this.stores.app.ensureOnboarded()
    } catch (err) {
      if (err instanceof TalismanNotOnboardedError)
        throw new EthProviderRpcError(err.message, ETH_ERROR_EIP1993_UNAUTHORIZED)
    }

    switch (type) {
      case "pub(eth.subscribe)":
        return this.ethSubscribe(id, url, port)

      case "pub(eth.request)": {
        try {
          return await this.ethRequest(id, url, request as EthRequestArgs, port)
        } catch (err) {
          // error may already be formatted by our handler
          if (err instanceof EthProviderRpcError) throw err

          const { code, message, shortMessage, details } = err as RpcError
          const cause = getEvmErrorCause(err as AnyEvmError)

          const myError = new EthProviderRpcError(
            shortMessage ?? message ?? "Internal error",
            code ?? ETH_ERROR_EIP1474_INTERNAL_ERROR,
            // assume if data property is present, it's an EVM revert => dapp expects that underlying error object
            cause.data ? cause : details
          )

          throw myError
        }
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
