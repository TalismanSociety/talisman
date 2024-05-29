import { HexString } from "@polkadot/util/types"
import type { CustomEvmErc20Token } from "@talismn/balances"
import type { EvmNetworkId } from "@talismn/chaindata-provider"
import type {
  AddEthereumChainParameter,
  EIP1193Parameters,
  Address as EvmAddress,
  Chain as EvmChain,
  TransactionRequest,
} from "viem"
import { PublicRpcSchema, RpcSchema, WalletRpcSchema } from "viem"

import { BaseRequest, BaseRequestId, RequestIdOnly } from "../../types/base"
import type { ETH_SEND, ETH_SIGN, KnownSigningRequestIdOnly } from "../signing/types"
import { WalletTransactionTransferInfo } from "../transactions"

export type { EvmAddress, EvmChain }

export interface AnyEthRequest {
  readonly method: string
  readonly params?: readonly unknown[] | object
}

export type AnyEvmError = {
  message?: string
  shortMessage?: string
  details?: string
  code?: number
  cause?: AnyEvmError
  data?: unknown
}

export type {
  EvmNetwork,
  CustomEvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  EthereumRpc,
} from "@talismn/chaindata-provider"

// define here the rpc methods that do not exist in viem or that need to be overriden
type TalismanRpcSchema = [
  {
    Method: "personal_ecRecover"
    Parameters: [signedData: `0x${string}`, signature: `0x${string}`]
    ReturnType: EvmAddress
  },
  {
    Method: "eth_signTypedData"
    Parameters: [message: unknown[], from: EvmAddress]
    ReturnType: `0x${string}`
  },
  {
    Method: "eth_signTypedData_v1"
    Parameters: [message: unknown[], from: EvmAddress]
    ReturnType: `0x${string}`
  },
  {
    Method: "eth_signTypedData_v3"
    Parameters: [from: EvmAddress, message: string]
    ReturnType: `0x${string}`
  },
  {
    // TODO see if we can remove this one
    // override for now because of result type mismatch
    Method: "wallet_requestPermissions"
    Parameters: [permissions: { eth_accounts: Record<string, unknown> }]
    ReturnType: Web3WalletPermission[]
  }
]

export type FullRpcSchema = [...PublicRpcSchema, ...WalletRpcSchema, ...TalismanRpcSchema]

type EthRequestSignaturesMap<TRpcSchema extends RpcSchema> = {
  [K in TRpcSchema[number]["Method"]]: [
    Extract<TRpcSchema[number], { Method: K }>["Parameters"],
    Extract<TRpcSchema[number], { Method: K }>["ReturnType"]
  ]
}

export type EthRequestSignatures = EthRequestSignaturesMap<FullRpcSchema>

export type EthRequestMethod = keyof EthRequestSignatures
export type EthRequestParams<T extends EthRequestMethod> = EthRequestSignatures[T][0]
export type EthRequestResult<T extends EthRequestMethod> = EthRequestSignatures[T][1]

export type EthRequestArguments<T extends EthRequestMethod> = {
  readonly method: T
  readonly params: EthRequestParams<T>
}

// TODO yeet ?
export type EthRequestArgs = EIP1193Parameters<FullRpcSchema>
export type EthRequestSignArguments = EthRequestArguments<
  | "personal_sign"
  | "eth_signTypedData"
  | "eth_signTypedData_v1"
  | "eth_signTypedData_v3"
  | "eth_signTypedData_v4"
>

export interface EthProviderMessage {
  readonly type: string
  readonly data: unknown
}

export type EthTxSignAndSend = {
  evmNetworkId: EvmNetworkId
  unsigned: TransactionRequest<string>
  transferInfo?: WalletTransactionTransferInfo
}
export type EthTxSendSigned = {
  evmNetworkId: EvmNetworkId
  unsigned: TransactionRequest<string>
  signed: `0x${string}`
  transferInfo?: WalletTransactionTransferInfo
}

export declare type EthApproveSignAndSend = KnownSigningRequestIdOnly<ETH_SEND> & {
  transaction: TransactionRequest<string>
}

export type EthRequestSigningApproveSignature = KnownSigningRequestIdOnly<ETH_SIGN> & {
  signedPayload: `0x${string}`
}

export type EthRequestSignAndSendApproveSignature = KnownSigningRequestIdOnly<ETH_SEND> & {
  unsigned: TransactionRequest<string>
  signedPayload: `0x${string}`
}

export interface AnyEthRequestChainId extends AnyEthRequest {
  chainId: EvmNetworkId
}

export type EthNonceRequest = {
  address: `0x${string}`
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
  "pub(eth.request)": [AnyEthRequest, unknown]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  "pub(eth.mimicMetaMask)": [null, boolean]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, unknown]
  "pri(eth.transactions.count)": [EthNonceRequest, number]
  "pri(eth.signing.signAndSend)": [EthTxSignAndSend, HexString]
  "pri(eth.signing.sendSigned)": [EthTxSendSigned, HexString]
  "pri(eth.signing.cancel)": [KnownSigningRequestIdOnly<"eth-send" | "eth-sign">, boolean]
  "pri(eth.signing.approveSign)": [KnownSigningRequestIdOnly<"eth-sign">, boolean]
  "pri(eth.signing.approveSignAndSend)": [EthApproveSignAndSend, boolean]
  "pri(eth.signing.approveSignHardware)": [EthRequestSigningApproveSignature, boolean]
  "pri(eth.signing.approveSignAndSendHardware)": [EthRequestSignAndSendApproveSignature, boolean]
  // eth add networks requests management
  // TODO change naming for network add requests, and maybe delete the first one
  "pri(eth.networks.add.requests)": [null, AddEthereumChainRequest[]]
  "pri(eth.networks.add.approve)": [AddEthereumChainRequestApprove, boolean]
  "pri(eth.networks.add.cancel)": [AddEthereumChainRequestIdOnly, boolean]
  // eth watchassets requests  management
  "pri(eth.watchasset.requests.approve)": [WatchAssetRequestIdOnly, boolean]
  "pri(eth.watchasset.requests.cancel)": [WatchAssetRequestIdOnly, boolean]

  // ethereum networks message signatures
  "pri(eth.networks.subscribe)": [null, boolean, boolean]
  "pri(eth.networks.remove)": [RequestIdOnly, boolean]
  "pri(eth.networks.reset)": [RequestIdOnly, boolean]
  "pri(eth.networks.upsert)": [RequestUpsertCustomEvmNetwork, boolean]
}

export type EthGasSettingsLegacy<TQuantity = bigint> = {
  type: "legacy" | "eip2930"
  gas: TQuantity
  gasPrice: TQuantity
}
export type EthGasSettingsEip1559<TQuantity = bigint> = {
  type: "eip1559"
  gas: TQuantity
  maxFeePerGas: TQuantity
  maxPriorityFeePerGas: TQuantity
}
export type EthGasSettings<TQuantity = bigint> =
  | EthGasSettingsLegacy<TQuantity>
  | EthGasSettingsEip1559<TQuantity>

export type LedgerEthDerivationPathType = "LedgerLive" | "Legacy" | "BIP44"

// requests
export type ETH_NETWORK_ADD_PREFIX = "eth-network-add"
export const ETH_NETWORK_ADD_PREFIX: ETH_NETWORK_ADD_PREFIX = "eth-network-add"
export type AddEthereumChainRequestId = BaseRequestId<ETH_NETWORK_ADD_PREFIX>
export type AddEthereumChainRequestIdOnly = { id: AddEthereumChainRequestId }
export type AddEthereumChainRequestApprove = {
  id: AddEthereumChainRequestId
  enableDefault: boolean
}

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
  token: CustomEvmErc20Token
  warnings: string[]
}

export type EthRequests = {
  [ETH_NETWORK_ADD_PREFIX]: [AddEthereumChainRequest, null]
  [WATCH_ASSET_PREFIX]: [WatchAssetRequest, boolean]
}
