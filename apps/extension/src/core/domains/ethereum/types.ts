import type { ETH_SEND, ETH_SIGN, KnownSigningRequestIdOnly } from "@core/domains/signing/types"
import type { CustomErc20Token } from "@core/domains/tokens/types"
import { AnyEthRequest } from "@core/injectEth/types"
import { BaseRequest, BaseRequestId, RequestIdOnly } from "@core/types/base"
import { BlockWithTransactions } from "@ethersproject/abstract-provider"
// import type {
//   Block,
//   BlockTag,
//   TransactionReceipt,
//   TransactionRequest,
//   TransactionResponse,
// } from "@ethersproject/providers"
// Compliant with https://eips.ethereum.org/EIPS/eip-1193
import type { InjectedAccount } from "@polkadot/extension-inject/types"
import { HexString } from "@polkadot/util/types"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { BigNumberish, ethers } from "ethers"
import type {
  AddEthereumChainParameter,
  EIP1193Parameters,
  Address as EvmAddress,
  Chain as EvmChain,
  TransactionRequest,
} from "viem"
import { PublicRpcSchema, RpcSchema, WalletRpcSchema } from "viem"

import { WalletTransactionTransferInfo } from "../transactions"

export type { EvmAddress, EvmChain }

export type {
  EvmNetwork,
  CustomEvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  EthereumRpc,
} from "@talismn/chaindata-provider"

type Promisify<T> = T | Promise<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PromisifyArray<T extends Array<any>> = {
  /* The inbuilt ethers provider methods take arguments which can
   * be a value or the promise of a value, this utility type converts a normal
   * object type into one where all the values may be promises
   */
  [K in keyof T]: Promisify<T[K]>
}

export type EthRequestGetBalance = PromisifyArray<[string, ethers.providers.BlockTag]>

export type EthRequestGetStorage = PromisifyArray<[string, BigNumberish, ethers.providers.BlockTag]>

export type EthRequestGetTxCount = PromisifyArray<[string, ethers.providers.BlockTag]>

export type EthRequestBlockTagOnly = PromisifyArray<[ethers.providers.BlockTag]>

export type EthRequestSendRawTx = PromisifyArray<[string]>

export type EthRequestCall = [
  ethers.providers.TransactionRequest,
  Promise<ethers.providers.BlockTag>
]

export type EthRequestEstimateGas = [ethers.providers.TransactionRequest, string]

export type EthRequestGetBlock = PromisifyArray<[ethers.providers.BlockTag, boolean]>

export type EthRequestTxHashOnly = PromisifyArray<[string]>

export type EthRequestSign = [string, string]
export type EthRequestRecoverAddress = [string, `0x${string}`]

export type EthRequestSendTx = [ethers.providers.TransactionRequest]

export type EthRequestAddEthereumChain = [AddEthereumChainParameter]

export type EthRequestSwitchEthereumChain = [{ chainId: string }]

type RpcSchemaMap<TRpcSchema extends RpcSchema> = {
  [K in TRpcSchema[number]["Method"]]: [
    Extract<TRpcSchema[number], { Method: K }>["Parameters"],
    Extract<TRpcSchema[number], { Method: K }>["ReturnType"]
  ]
}

// type RpcSchemaMapBetter<TRpcSchema extends RpcSchema> = {
//   [K in TRpcSchema[number]["Method"]]: {
//     parameters: Extract<TRpcSchema[number], { Method: K }>["Parameters"]
//     returnType: Extract<TRpcSchema[number], { Method: K }>["ReturnType"]
//   }
// }

// define here the rpc methods that do not exist in viem or need to be overriden
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
    // TODO see if we can remove this
    // override for now because of result type mismatch
    Method: "wallet_requestPermissions"
    Parameters: [permissions: { eth_accounts: Record<string, unknown> }]
    ReturnType: Web3WalletPermission[]
  }
]

export type FullRpcSchema = [...PublicRpcSchema, ...WalletRpcSchema, ...TalismanRpcSchema]

// export type EthRequestSignaturesPublic = RpcSchemaMap<PublicRpcSchema>
// export type EthRequestSignaturesWallet = RpcSchemaMap<WalletRpcSchema>
export type EthRequestSignaturesFull = RpcSchemaMap<FullRpcSchema>

// TODO : replace EthRequestSignatures by EthRequestSignaturesViem
export interface EthRequestSignatures {
  eth_requestAccounts: [null, InjectedAccount[]]
  eth_gasPrice: [null, string]
  eth_accounts: [null, string]
  eth_blockNumber: [null, number]
  eth_chainId: [null, string]
  eth_coinbase: [null, string]
  net_version: [null, string]
  eth_getBalance: [EthRequestGetBalance, string]
  eth_getStorageAt: [EthRequestGetStorage, string]
  eth_getTransactionCount: [EthRequestGetTxCount, string]
  eth_getBlockTransactionCountByHash: [EthRequestBlockTagOnly, string]
  eth_getBlockTransactionCountByNumber: [EthRequestBlockTagOnly, string]
  eth_getCode: [EthRequestBlockTagOnly, ethers.providers.Block]
  eth_sendRawTransaction: [EthRequestSendRawTx, ethers.providers.TransactionResponse]
  eth_call: [EthRequestCall, string]
  estimateGas: [EthRequestEstimateGas, string]
  eth_getBlockByHash: [EthRequestGetBlock, ethers.providers.Block | BlockWithTransactions]
  eth_getBlockByNumber: [EthRequestGetBlock, ethers.providers.Block | BlockWithTransactions]
  eth_getTransactionByHash: [EthRequestTxHashOnly, ethers.providers.TransactionResponse]
  eth_getTransactionReceipt: [EthRequestTxHashOnly, ethers.providers.TransactionReceipt]
  personal_sign: [EthRequestSign, string]
  eth_signTypedData: [EthRequestSign, string]
  eth_signTypedData_v1: [EthRequestSign, string]
  eth_signTypedData_v3: [EthRequestSign, string]
  eth_signTypedData_v4: [EthRequestSign, string]
  eth_sendTransaction: [EthRequestSendTx, string]
  personal_ecRecover: [EthRequestRecoverAddress, string]

  // EIP 747 https://github.com/ethereum/EIPs/blob/master/EIPS/eip-747.md
  wallet_watchAsset: [WatchAssetBase, string]

  // pending EIP https://eips.ethereum.org/EIPS/eip-3085, defined by metamask to let dapp add chains.
  // returns `null` if the request was successful, otherwise throws an error.
  // metamask will automatically reject this when:
  // - the rpc endpoint doesn't respond to rpc calls
  // - the rpc endpoint returns a different chain id than the one specified
  // - the chain id corresponds to any of the default metamask chains
  wallet_addEthereumChain: [EthRequestAddEthereumChain, null]

  // pending EIP https://eips.ethereum.org/EIPS/eip-3326, defined by metamask to let dapp change chain.
  // returns `null` if the request was successful, otherwise throws an error.
  // if the `error.code` is `4902` then the dapp is more likely to call `wallet_addEthereumChain`.
  // metamask will automatically reject this when:
  // - the chain id is malformed
  // - the chain with the specified id has not been added to metamask
  wallet_switchEthereumChain: [EthRequestSwitchEthereumChain, null]

  // https://docs.metamask.io/guide/rpc-api.html#wallet-getpermissions
  wallet_getPermissions: [null, Web3WalletPermission[]]

  // https://docs.metamask.io/guide/rpc-api.html#wallet-requestpermissions
  wallet_requestPermissions: [[RequestedPermissions], Web3WalletPermission[]]
}

// export type EthRequestTypes = keyof EthRequestSignatures
// TODO yeet
export type EthResponseTypes = EthRequestSignatures[keyof EthRequestSignatures][1]
//export type EthResponseType<T extends EthRequestTypes> = EthRequestSignatures[T][1]
//export type EthRequestParams = EthRequestSignatures[keyof EthRequestSignatures][0]
// export interface EthRequestArguments<T extends EthRequestTypes> {
//   readonly method: T
//   readonly params: EthRequestSignatures[T][0]
// }

export type EthRequestArgumentsViem<T extends keyof EthRequestSignaturesFull> = {
  readonly method: T
  readonly params: EthRequestSignaturesFull[T][0]
}

export type EthRequestArgsViem = EIP1193Parameters<FullRpcSchema>

export type EthRequestResultViem<T extends keyof EthRequestSignaturesFull> =
  EthRequestSignaturesFull[T][1]

export type EthRequestSignArguments = EthRequestArgumentsViem<
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
// export type AddEthereumChainParameter = {
//   /** A 0x-prefixed hexadecimal string */
//   chainId: string
//   chainName: string
//   nativeCurrency: {
//     name: string
//     /** 2-6 characters long */
//     symbol: string
//     decimals: 18
//   }
//   rpcUrls: string[]
//   blockExplorerUrls?: string[]
//   /** Currently ignored by metamask */
//   iconUrls?: string[]
// }

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
  "pub(eth.request)": [AnyEthRequest, EthResponseTypes]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  "pub(eth.mimicMetaMask)": [null, boolean]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, EthResponseTypes]
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
  "pri(eth.networks.add.approve)": [AddEthereumChainRequestIdOnly, boolean]
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
  warnings: string[]
}

export type EthRequests = {
  [ETH_NETWORK_ADD_PREFIX]: [AddEthereumChainRequest, null]
  [WATCH_ASSET_PREFIX]: [WatchAssetRequest, boolean]
}
