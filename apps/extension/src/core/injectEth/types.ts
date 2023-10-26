import EventEmitter from "events"

import type {
  AddEthereumChainParameter,
  RequestedPermissions,
  Web3WalletPermission,
} from "@core/domains/ethereum/types"
import type { WatchAssetBase } from "@core/domains/ethereum/types"
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export type EthRequestRecoverAddress = [string, `0x${string}`]

export type EthRequestSendTx = [TransactionRequest]

export type EthRequestAddEthereumChain = [AddEthereumChainParameter]

export type EthRequestSwitchEthereumChain = [{ chainId: string }]

// TODO : nuke all this and use viem's EIP1193RequestFn<WalletRpcSchema> ?
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
  eth_getCode: [EthRequestBlockTagOnly, Block]
  eth_sendRawTransaction: [EthRequestSendRawTx, TransactionResponse]
  eth_call: [EthRequestCall, string]
  estimateGas: [EthRequestEstimateGas, string]
  eth_getBlockByHash: [EthRequestGetBlock, Block | BlockWithTransactions]
  eth_getBlockByNumber: [EthRequestGetBlock, Block | BlockWithTransactions]
  eth_getTransactionByHash: [EthRequestTxHashOnly, TransactionResponse]
  eth_getTransactionReceipt: [EthRequestTxHashOnly, TransactionReceipt]
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

export type EthRequestTypes = keyof EthRequestSignatures
export type EthResponseTypes = EthRequestSignatures[keyof EthRequestSignatures][1]
export type EthResponseType<T extends EthRequestTypes> = EthRequestSignatures[T][1]
export type EthRequestParams = EthRequestSignatures[keyof EthRequestSignatures][0]
export interface EthRequestArguments<T extends EthRequestTypes> {
  readonly method: T
  readonly params: EthRequestSignatures[T][0]
}

export type EthRequestSignArguments = EthRequestArguments<
  | "personal_sign"
  | "eth_signTypedData"
  | "eth_signTypedData_v1"
  | "eth_signTypedData_v3"
  | "eth_signTypedData_v4"
>

export interface AnyEthRequest {
  readonly method: EthRequestTypes
  readonly params: EthRequestSignatures[EthRequestTypes][0]
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
