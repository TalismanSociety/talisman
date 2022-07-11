import { AccountAddressType, AccountsMessages } from "@core/domains/accounts/types"
import { AppMessages } from "@core/domains/app/types"
import { BalancesMessages } from "@core/domains/balances/types"
import { ChainId, ChainsMessages } from "@core/domains/chains/types"
import { SigningMessages } from "@core/domains/signing/types"
import { AuthorisedSiteMessages } from "@core/domains/sitesAuthorised/types"
import { CustomErc20Token, TokenId, TokenMessages } from "@core/domains/tokens/types"
import { AssetTransferMessages } from "@core/domains/transactions/types"
import { AnyEthRequest, EthProviderMessage, EthResponseTypes } from "@core/injectEth/types"
import type {
  MetadataRequest,
  RequestSignatures as PolkadotRequestSignatures,
  RequestMetadataSubscribe,
} from "@polkadot/extension-base/background/types"
import type { ExtrinsicStatus, Hash } from "@polkadot/types/interfaces"

import type { IdOnlyValues, NoUndefinedValues, NullKeys, RequestIdOnly } from "./base"

export type { ExtrinsicStatus, Hash, MetadataRequest } // Make this available elsewhere also

export type {
  AllowedPath,
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
  RequestBatchRestore,
  RequestDeriveCreate,
  RequestDeriveValidate,
  RequestJsonRestore,
  RequestMetadataApprove,
  RequestMetadataReject,
  RequestSeedCreate,
  RequestSeedValidate,
  ResponseDeriveValidate,
  ResponseSeedCreate,
  ResponseSeedValidate,
  SeedLengths,
} from "@polkadot/extension-base/background/types"

export declare type RequestTypes = {
  [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][0]
}

export declare type ResponseTypes = {
  [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][1]
}

export declare type SubscriptionMessageTypes = NoUndefinedValues<{
  [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][2]
}>

export declare type RequestIdOnlyMessageTypes = IdOnlyValues<{
  [MessageType in keyof RequestSignatures]: RequestSignatures[MessageType][0]
}>

export declare type EthApproveSignAndSend = RequestIdOnly & {
  maxPriorityFeePerGas: string
  maxFeePerGas: string
}
export interface AnyEthRequestChainId extends AnyEthRequest {
  chainId: number
}

type RemovedMessages =
  | "pri(signing.approve.password)"
  | "pri(signing.approve.signature)"
  | "pri(authorize.list)"
  | "pri(authorize.requests)"
  | "pri(accounts.create.suri)"
  | "pri(accounts.create.hardware)"
  | "pri(accounts.export)"
  | "pri(accounts.forget)"
  | "pri(accounts.subscribe)"
  | "pri(signing.requests)"
  | "pri(metadata.requests)"
  | "pri(derivation.create)"
  | "pri(derivation.validate)"
  | "pri(accounts.changePassword)"
  | "pri(seed.validate)"

type RequestSignaturesBase = Omit<PolkadotRequestSignatures, RemovedMessages> &
  AuthorisedSiteMessages &
  AccountsMessages &
  AppMessages &
  AssetTransferMessages &
  BalancesMessages &
  ChainsMessages &
  SigningMessages &
  TokenMessages

export interface RequestSignatures extends RequestSignaturesBase {
  // Values for RequestSignatures are arrays where the items are [RequestType, ResponseType, SubscriptionMesssageType?]

  "pri(unsubscribe)": [RequestIdOnly, null]

  // mnemonic message signatures
  "pri(mnemonic.unlock)": [string, string]
  "pri(mnemonic.confirm)": [boolean, boolean]
  "pri(mnemonic.subscribe)": [null, boolean, MnemonicSubscriptionResult]
  "pri(mnemonic.address)": [RequestAddressFromMnemonic, string]

  // metadata message signatures
  "pri(metadata.requests)": [RequestMetadataSubscribe, boolean, MetadataRequest[]]

  // all ethereum calls
  "pub(eth.request)": [AnyEthRequest, EthResponseTypes]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  "pub(eth.mimicMetaMask)": [null, boolean]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, EthResponseTypes]
  "pri(eth.signing.cancel)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSign)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSignAndSend)": [EthApproveSignAndSend, boolean]
  // eth add networks requests management
  // TODO change naming for network add requests, and maybe delete the first one
  "pri(eth.networks.add.requests)": [null, AddEthereumChainRequest[]]
  "pri(eth.networks.add.approve)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.cancel)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.subscribe)": [null, boolean, AddEthereumChainRequest[]]
  // eth watchassets requests  management
  "pri(eth.watchasset.requests.approve)": [RequestIdOnly, boolean]
  "pri(eth.watchasset.requests.cancel)": [RequestIdOnly, boolean]
  "pri(eth.watchasset.requests.subscribe)": [null, boolean, WatchAssetRequest[]]
  "pri(eth.watchasset.requests.subscribe.byid)": [RequestIdOnly, boolean, WatchAssetRequest]

  // ethereum networks message signatures
  "pri(eth.networks.subscribe)": [null, boolean, boolean]
  "pri(eth.networks.add.custom)": [CustomEvmNetwork, boolean]
  "pri(eth.networks.removeCustomNetwork)": [RequestIdOnly, boolean]
  "pri(eth.networks.clearCustomNetworks)": [null, boolean]
}

export declare type MessageTypes = keyof RequestSignatures

export declare type MessageTypesWithNullRequest = NullKeys<RequestTypes>

export declare type OriginTypes = "talisman-page" | "talisman-extension"

export interface TransportRequestMessage<TMessageType extends MessageTypes> {
  id: string
  message: TMessageType
  origin: OriginTypes
  request: RequestTypes[TMessageType]
}

export declare type MessageTypesWithSubscriptions = keyof SubscriptionMessageTypes
export declare type MessageTypesWithSubscriptionsById = keyof RequestIdOnlyMessageTypes &
  MessageTypesWithSubscriptions

export declare type MessageTypesWithNoSubscriptions = Exclude<
  MessageTypes,
  keyof SubscriptionMessageTypes
>

interface TransportResponseMessageNoSub<TMessageType extends MessageTypesWithNoSubscriptions> {
  error?: string
  id: string
  response?: ResponseTypes[TMessageType]
}

interface TransportResponseMessageSub<TMessageType extends MessageTypesWithSubscriptions> {
  error?: string
  id: string
  response?: ResponseTypes[TMessageType]
  subscription?: SubscriptionMessageTypes[TMessageType]
}

export declare type TransportResponseMessage<TMessageType extends MessageTypes> =
  TMessageType extends MessageTypesWithNoSubscriptions
    ? TransportResponseMessageNoSub<TMessageType>
    : TMessageType extends MessageTypesWithSubscriptions
    ? TransportResponseMessageSub<TMessageType>
    : never

export declare type ResponseType<TMessageType extends keyof RequestSignatures> =
  RequestSignatures[TMessageType][1]

/**
 * A callback with either an error or a result.
 */
export interface SubscriptionCallback<Result> {
  (error: null, result: Result): void
  (error: any, result?: never): void
}

/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void

export type WatchAssetBase = {
  type: "ERC20"
  options: {
    address: string // The hexadecimal Ethereum address of the token contract
    symbol?: string // A ticker symbol or shorthand, up to 5 alphanumerical characters
    decimals?: number // The number of asset decimals
    image?: string // A string url of the token logo
  }
}

export type WatchAssetRequest = {
  request: WatchAssetBase
  token: CustomErc20Token
  id: string
  url: string
}

export type EthereumRpc = {
  url: string // The url of this ethereum RPC
  isHealthy: boolean // The health status of this ethereum RPC
}

export type EvmNetworkId = number
export type EvmNetwork = {
  id: EvmNetworkId
  isTestnet: boolean
  sortIndex: number | null
  name: string | null
  // TODO: Create ethereum tokens store (and reference here by id).
  //       Or extend substrate tokens store to support both substrate and ethereum tokens.
  nativeToken: { id: TokenId } | null
  tokens: Array<{ id: TokenId }> | null
  explorerUrl: string | null
  rpcs: Array<EthereumRpc> | null
  isHealthy: boolean
  substrateChain: { id: EvmNetworkId } | null
}
export type CustomEvmNetwork = EvmNetwork & {
  isCustom: true
  explorerUrls: string[]
  iconUrls: string[]
}

export type EvmNetworkList = Record<EvmNetworkId, EvmNetwork | CustomEvmNetwork>

// transaction types ----------------------------

export declare type MnemonicSubscriptionResult = {
  confirmed?: boolean
}

export declare type RequestAddressFromMnemonic = {
  mnemonic: string
  type?: AccountAddressType
}

// ethereum networks

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

export type AddEthereumChainRequest = {
  id: string
  idStr: string
  url: string
  network: AddEthereumChainParameter
}

export interface SendRequest {
  <TMessageType extends MessageTypesWithNullRequest>(message: TMessageType): Promise<
    ResponseTypes[TMessageType]
  >
  <TMessageType extends MessageTypesWithNoSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType]
  ): Promise<ResponseTypes[TMessageType]>
  <TMessageType extends MessageTypesWithSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType],
    subscriber: (data: SubscriptionMessageTypes[TMessageType]) => void
  ): Promise<ResponseTypes[TMessageType]>
}

export declare type CachedUnlocks = Record<string, number>
