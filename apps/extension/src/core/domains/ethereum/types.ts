import type { ETH_SEND, ETH_SIGN, KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import type { CustomErc20Token } from "@core/domains/tokens/types"
import { AnyEthRequest, EthProviderMessage, EthResponseTypes } from "@core/injectEth/types"
import { BaseRequest, BaseRequestId, RequestIdOnly } from "@core/types/base"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { BigNumberish, ethers } from "ethers"

export type {
  EvmNetwork,
  CustomEvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  EthereumRpc,
} from "@talismn/chaindata-provider"

export type AddEthereumChainParameter = {
  /** A 0x-prefixed hexadecimal string */
  chainId: string
  chainName: string
  nativeCurrency: {
    name: string
    /** 2-6 characters long */
    symbol: string
    decimals: 18
  }
  rpcUrls: string[]
  blockExplorerUrls?: string[]
  /** Currently ignored by metamask */
  iconUrls?: string[]
}

export declare type EthApproveSignAndSend = KnownSigningRequestIdOnly<ETH_SEND> & {
  transaction: ethers.providers.TransactionRequest
}

export type EthRequestSigningApproveSignature<T extends ETH_SIGN | ETH_SEND> =
  KnownSigningRequestIdOnly<T> & {
    signedPayload: `0x${string}`
  }

export interface AnyEthRequestChainId extends AnyEthRequest {
  chainId: EvmNetworkId
}

export type EthNonceRequest = {
  address: string
  evmNetworkId: EvmNetworkId
}

// ethereum networks

export type Web3WalletPermissionTarget = "eth_accounts" // add more options as needed using |

// from https://docs.metamask.io/guide/rpc-api.html#restricted-methods
export interface Web3WalletPermission {
  // The name of the method corresponding to the permission
  parentCapability: Web3WalletPermissionTarget

  // The date the permission was granted, in UNIX epoch time
  date?: number

  // more to come...
}

// from https://docs.metamask.io/guide/rpc-api.html#wallet-requestpermissions
export type RequestedPermissions = Record<Web3WalletPermissionTarget, unknown>

export type RequestUpsertCustomEvmNetwork = {
  id: EvmNetworkId
  name: string
  chainLogoUrl: string | null
  isTestnet: boolean
  rpcs: { url: string }[]
  blockExplorerUrl?: string
  tokenSymbol: string
  tokenDecimals: number
  tokenCoingeckoId: string | null
  tokenLogoUrl: string | null
}

export interface EthMessages {
  // all ethereum calls
  "pub(eth.request)": [AnyEthRequest, EthResponseTypes]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  "pub(eth.mimicMetaMask)": [null, boolean]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, EthResponseTypes]
  "pri(eth.transactions.count)": [EthNonceRequest, number]
  "pri(eth.signing.cancel)": [KnownSigningRequestIdOnly<"eth-send" | "eth-sign">, boolean]
  "pri(eth.signing.approveSign)": [KnownSigningRequestIdOnly<"eth-sign">, boolean]
  "pri(eth.signing.approveSignAndSend)": [EthApproveSignAndSend, boolean]
  "pri(eth.signing.approveSignHardware)": [EthRequestSigningApproveSignature<"eth-sign">, boolean]
  "pri(eth.signing.approveSignAndSendHardware)": [
    EthRequestSigningApproveSignature<"eth-send">,
    boolean
  ]
  // eth add networks requests management
  // TODO change naming for network add requests, and maybe delete the first one
  "pri(eth.networks.add.requests)": [null, AddEthereumChainRequest[]]
  "pri(eth.networks.add.approve)": [AddEthereumChainRequestIdOnly, boolean]
  "pri(eth.networks.add.cancel)": [AddEthereumChainRequestIdOnly, boolean]
  "pri(eth.networks.add.subscribe)": [null, boolean, AddEthereumChainRequest[]]
  // eth watchassets requests  management
  "pri(eth.watchasset.requests.approve)": [WatchAssetRequestIdOnly, boolean]
  "pri(eth.watchasset.requests.cancel)": [WatchAssetRequestIdOnly, boolean]
  "pri(eth.watchasset.requests.subscribe)": [null, boolean, WatchAssetRequest[]]
  "pri(eth.watchasset.requests.subscribe.byid)": [
    WatchAssetRequestIdOnly,
    boolean,
    WatchAssetRequest
  ]

  // ethereum networks message signatures
  "pri(eth.networks.subscribe)": [null, boolean, boolean]
  "pri(eth.networks.remove)": [RequestIdOnly, boolean]
  "pri(eth.networks.reset)": [RequestIdOnly, boolean]
  "pri(eth.networks.upsert)": [RequestUpsertCustomEvmNetwork, boolean]
}

export type EthGasSettingsLegacy = {
  type: 0
  gasLimit: BigNumberish
  gasPrice: BigNumberish
}
export type EthGasSettingsEip1559 = {
  type: 2
  gasLimit: BigNumberish
  maxFeePerGas: BigNumberish
  maxPriorityFeePerGas: BigNumberish
}
export type EthGasSettings = EthGasSettingsLegacy | EthGasSettingsEip1559

export type LedgerEthDerivationPathType = "LedgerLive" | "Legacy" | "BIP44"

// requests
export type ETH_NETWORK_ADD_PREFIX = "eth-network-add"
export const ETH_NETWORK_ADD_PREFIX: ETH_NETWORK_ADD_PREFIX = "eth-network-add"
export type AddEthereumChainRequestId = BaseRequestId<ETH_NETWORK_ADD_PREFIX>
export type AddEthereumChainRequestIdOnly = { id: AddEthereumChainRequestId }

export type AddEthereumChainRequest = BaseRequest<ETH_NETWORK_ADD_PREFIX> & {
  idStr: string
  url: string
  network: AddEthereumChainParameter
}

export type WatchAssetBase = {
  type: "ERC20"
  options: {
    address: string // The hexadecimal Ethereum address of the token contract
    symbol?: string // A ticker symbol or shorthand, up to 11 alphanumerical characters
    decimals?: number // The number of asset decimals
    image?: string // A string url of the token logo
  }
}

export type WATCH_ASSET_PREFIX = "eth-watchasset"
export const WATCH_ASSET_PREFIX: WATCH_ASSET_PREFIX = "eth-watchasset"
export type WatchAssetRequestId = BaseRequestId<WATCH_ASSET_PREFIX>
export type WatchAssetRequestIdOnly = { id: WatchAssetRequestId }
export type WatchAssetRequest = BaseRequest<WATCH_ASSET_PREFIX> & {
  url: string
  request: WatchAssetBase
  token: CustomErc20Token
}

export type EthRequests = {
  [ETH_NETWORK_ADD_PREFIX]: [AddEthereumChainRequest, null]
  [WATCH_ASSET_PREFIX]: [WatchAssetRequest, boolean]
}
