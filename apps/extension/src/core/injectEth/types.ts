import EventEmitter from "events"

import type { AddEthereumChainParameter, WatchAssetBase } from "@core/types"
import { BlockWithTransactions } from "@ethersproject/abstract-provider"
import { BigNumberish } from "@ethersproject/bignumber"
import type {
  Block,
  BlockTag,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "@ethersproject/providers"
// Compliant with https://eips.ethereum.org/EIPS/eip-1193
import type { InjectedAccount } from "@polkadot/extension-inject/types"

type Promisify<T> = T | Promise<T>

type PromisifyArray<T extends Array<any>> = {
  /* The inbuilt ethers provider methods take arguments which can
   * be a value or the promise of a value, this utility type converts a normal
   * object type into one where all the values may be promises
   */
  [K in keyof T]: Promisify<T[K]>
}

export type EthRequestGetBalance = PromisifyArray<[string, BlockTag]>

export type EthRequestGetStorage = PromisifyArray<[string, BigNumberish, BlockTag]>

export type EthRequestGetTxCount = PromisifyArray<[string, BlockTag]>

export type EthRequestBlockTagOnly = PromisifyArray<[BlockTag]>

export type EthRequestSendRawTx = PromisifyArray<[string]>

export type EthRequestCall = [TransactionRequest, Promise<BlockTag>]

export type EthRequestEstimateGas = [TransactionRequest, string]

export type EthRequestGetBlock = PromisifyArray<[BlockTag, boolean]>

export type EthRequestTxHashOnly = PromisifyArray<[string]>

export type EthRequestSign = [string, string]

export type EthRequestSendTx = [TransactionRequest]

export type EthRequestAddEthereumChain = [AddEthereumChainParameter]

export type EthRequestSwitchEthereumChain = [{ chainId: string }]

export interface EthRequestSignatures {
  eth_requestAccounts: [null, InjectedAccount[]]
  eth_gasPrice: [null, string]
  eth_accounts: [null, string]
  eth_blockNumber: [null, number]
  eth_chainId: [null, string]
  eth_getBalance: [EthRequestGetBalance, string]
  eth_getStorageAt: [EthRequestGetStorage, string]
  eth_getTransactionCount: [EthRequestGetTxCount, string]
  eth_getBlockTransactionCountByHash: [EthRequestBlockTagOnly, string]
  eth_getBlockTransactionCountByNumber: [EthRequestBlockTagOnly, string]
  eth_getCode: [EthRequestBlockTagOnly, Block]
  eth_sendRawTransaction: [EthRequestSendRawTx, TransactionResponse]
  eth_call: [EthRequestCall, string]
  estimateGas: [EthRequestEstimateGas, string]
  eth_getBlockByHash: [EthRequestGetBlock, Block | BlockWithTransactions]
  eth_getBlockByNumber: [EthRequestGetBlock, Block | BlockWithTransactions]
  eth_getTransactionByHash: [EthRequestTxHashOnly, TransactionResponse]
  eth_getTransactionReceipt: [EthRequestTxHashOnly, TransactionReceipt]
  eth_sign: [EthRequestSign, string]
  eth_sendTransaction: [EthRequestSendTx, string]
  // TODO suspect the following are mostly/only for internal use
  // eth_getUncleCountByBlockHash: [any, any] // TODO unknown if these are real messages
  // eth_getUncleCountByBlockNumber: [any, any] // TODO unknown if these are real messages
  // eth_getTransactionByBlockHashAndIndex: [any, any] // TODO unknown if these are real messages
  // eth_getTransactionByBlockNumberAndIndex: [any, any] // TODO unknown if these are real messages
  // eth_getUncleByBlockHashAndIndex: [any, any] // TODO unknown if these are real messages
  // eth_getUncleByBlockNumberAndIndex: [any, any] // TODO unknown if these are real messages
  // eth_newFilter: [any, any] // TODO unknown if these are real messages
  // eth_newBlockFilter: [any, any] // TODO unknown if these are real messages
  // eth_newPendingTransactionFilter: [[], any]
  // eth_uninstallFilter: [{ filterId: string }, any]
  // eth_getFilterChanges: [any, any]
  // eth_getFilterLogs: [any, any]
  // eth_getLogs: [any, any]

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
}

export type EthRequestTypes = keyof EthRequestSignatures
export type EthResponseTypes = EthRequestSignatures[keyof EthRequestSignatures][1]
export type EthResponseType<T extends EthRequestTypes> = EthRequestSignatures[T][1]
export type EthRequestParams = EthRequestSignatures[keyof EthRequestSignatures][0]
export interface EthRequestArguments<T extends EthRequestTypes> {
  readonly method: T
  readonly params: EthRequestSignatures[T][0]
}

export interface AnyEthRequest {
  readonly method: EthRequestTypes
  readonly params: EthRequestSignatures[EthRequestTypes][0]
}

// 4001	User Rejected Request	The user rejected the request.
// 4100	Unauthorized	        The requested method and/or account has not been authorized by the user.
// 4200	Unsupported Method	    The Provider does not support the requested method.
// 4900	Disconnected	        The Provider is disconnected from all chains.
// 4901	Chain Disconnected	    The Provider is not connected to the requested chain.
//
// 4900 is intended to indicate that the Provider is disconnected from all chains, while 4901 is intended to indicate that the Provider is disconnected from a specific chain only.
// In other words, 4901 implies that the Provider is connected to other chains, just not the requested one.
export class EthProviderRpcError extends Error {
  code: number
  data?: unknown

  constructor(message: string, code: number, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

export interface EthProviderMessage {
  readonly type: string
  readonly data: unknown
}

export type EthSubscriptionId = string

export interface EthSubscriptionData {
  readonly subscription: EthSubscriptionId
  readonly result: unknown
}

export interface EthSubscriptionMessage extends EthProviderMessage {
  readonly type: "eth_subscription"
  readonly data: EthSubscriptionData
}

export interface ProviderConnectInfo {
  readonly chainId: string
}

export interface EthProvider extends EventEmitter {
  request(args: AnyEthRequest): Promise<unknown>
}

export type TalismanWindow = Window &
  typeof globalThis & {
    talismanEth: EthProvider
    ethereum: EthProvider & { providers?: EthProvider[] }
  }

// https://eips.ethereum.org/EIPS/eip-1193#provider-errors
export const ETH_ERROR_EIP1993_USER_REJECTED = 4001
export const ETH_ERROR_EIP1993_UNAUTHORIZED = 4100
export const ETH_ERROR_EIP1993_UNSUPPORTED_METHOD = 4200
export const ETH_ERROR_EIP1993_DISCONNECTED = 4900
export const ETH_ERROR_EIP1993_CHAIN_DISCONNECTED = 4901

// not sure if this is standard
export const ETH_ERROR_UNKNOWN_CHAIN_NOT_CONFIGURED = 4902

// https://eips.ethereum.org/EIPS/eip-1474#error-codes
export const ETH_ERROR_EIP1474_PARSE_ERROR = -32700
export const ETH_ERROR_EIP1474_INVALID_REQUEST = -32600
export const ETH_ERROR_EIP1474_METHOD_NOT_FOUND = -32601
export const ETH_ERROR_EIP1474_INVALID_PARAMS = -32602
export const ETH_ERROR_EIP1474_INTERNAL_ERROR = -32603
export const ETH_ERROR_EIP1474_INVALID_INPUT = -32000
export const ETH_ERROR_EIP1474_RESOURCE_NOT_FOUND = -32001
export const ETH_ERROR_EIP1474_RESOURCE_UNAVAILABLE = -32002
export const ETH_ERROR_EIP1474_TRANSACTION_REJECTED = -32003
export const ETH_ERROR_EIP1474_METHOD_NOT_SUPPORTED = -32004
export const ETH_ERROR_EIP1474_LIMIT_EXCEEDED = -32005
export const ETH_ERROR_EIP1474_RPC_VERSION_NOT_SUPPORTED = -32006
