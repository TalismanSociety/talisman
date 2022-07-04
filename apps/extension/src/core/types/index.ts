import { AccountAddressType, AccountJson, AccountsMessages } from "@core/domains/accounts/types"
import { AuthorisedSiteMessages } from "@core/domains/sitesAuthorised/types"
import { AnyEthRequest, EthProviderMessage, EthResponseTypes } from "@core/injectEth/types"
import type { TransactionRequest as EthTransactionRequest } from "@ethersproject/abstract-provider"
import type {
  MetadataRequest,
  RequestSignatures as PolkadotRequestSignatures,
  SigningRequest as PolkadotSigningRequest,
  RequestMetadataSubscribe,
  RequestSigningApproveSignature,
  RequestSigningSubscribe,
} from "@polkadot/extension-base/background/types"
import type { Codec } from "@polkadot/types-codec/types"
import type { ExtrinsicStatus, Hash, Phase } from "@polkadot/types/interfaces"
import type { IEventData } from "@polkadot/types/types"
import type { SignerPayloadJSON, SignerPayloadRaw, TypeDef } from "@polkadot/types/types"
import { BigNumber } from "ethers"
import posthog from "posthog-js"

import type {
  Address,
  AddressesByChain,
  IdOnlyValues,
  NoUndefinedValues,
  NullKeys,
  RequestIdOnly,
} from "./base"

export type {
  ExtrinsicStatus,
  Hash,
  MetadataRequest,
  RequestSigningApproveSignature,
  SignerPayloadJSON,
  SignerPayloadRaw,
} // Make this available elsewhere also

export type {
  AllowedPath,
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
  ResponseSigning,
  RequestBatchRestore,
  RequestDeriveCreate,
  RequestDeriveValidate,
  RequestJsonRestore,
  RequestMetadataApprove,
  RequestMetadataReject,
  RequestSeedCreate,
  RequestSeedValidate,
  RequestSign,
  RequestSigningApprovePassword,
  RequestSigningCancel,
  RequestSigningIsLocked,
  ResponseDeriveValidate,
  ResponseSeedCreate,
  ResponseSeedValidate,
  ResponseSigningIsLocked,
  SeedLengths,
} from "@polkadot/extension-base/background/types"

export type TransactionMethodDetails = {
  section: string
  method: string
  args: Record<string, any>
  meta: {
    name: string
    fields: any[]
    index: string
    docs: string[]
    args: any[]
  }
}

export type TransactionDetails = {
  method: TransactionMethodDetails
  batch?: TransactionMethodDetails[]
  payment: { class: string; partialFee: string; weight: number }
}

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

export declare type ModalTypes = "send"
export interface ModalOpenParams {
  modalType: ModalTypes
}

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: posthog.Properties
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
  AccountsMessages

export interface RequestSignatures extends RequestSignaturesBase {
  // Values for RequestSignatures are arrays where the items are [RequestType, ResponseType, SubscriptionMesssageType?]

  "pri(unsubscribe)": [RequestIdOnly, null]
  // app message signatures ///// REQUIRES SORTING
  "pri(app.onboard)": [RequestOnboard, OnboardedType]
  "pri(app.onboardStatus)": [null, OnboardedType]
  "pri(app.onboardStatus.subscribe)": [null, boolean, OnboardedType]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(meta.onboard)": [null, OnboardedType]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [null, boolean]
  "pri(app.modalOpen.request)": [ModalOpenParams, boolean]
  "pri(app.modalOpen.subscribe)": [null, boolean, ModalOpenParams]
  "pri(app.promptLogin)": [boolean, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]

  // mnemonic message signatures
  "pri(mnemonic.unlock)": [string, string]
  "pri(mnemonic.confirm)": [boolean, boolean]
  "pri(mnemonic.subscribe)": [null, boolean, MnemonicSubscriptionResult]
  "pri(mnemonic.address)": [RequestAddressFromMnemonic, string]

  // balance message signatures
  "pri(balances.get)": [RequestBalance, BalanceStorage]
  "pri(balances.subscribe)": [null, boolean, boolean]
  "pri(balances.byparams.subscribe)": [RequestBalancesByParamsSubscribe, boolean, BalancesUpdate]

  // signing message signatures
  "pri(signing.approveSign)": [RequestIdOnly, boolean]
  "pri(signing.approveSign.hardware)": [RequestSigningApproveSignature, boolean]
  "pri(signing.decode)": [RequestIdOnly, TransactionDetails | null]
  "pri(signing.requests)": [RequestSigningSubscribe, boolean, AnySigningRequest[]]
  "pri(signing.byid.subscribe)": [RequestIdOnly, boolean, AnySigningRequest]

  // asset transfer signatures
  "pri(assets.transfer)": [RequestAssetTransfer, ResponseAssetTransfer]
  "pri(assets.transfer.checkFees)": [RequestAssetTransfer, ResponseAssetTransferFeeQuery]
  "pri(assets.transfer.approveSign)": [RequestAssetTransferApproveSign, ResponseAssetTransfer]

  // chain message signatures
  "pri(chains.subscribe)": [null, boolean, boolean]

  // token message signatures
  "pri(tokens.subscribe)": [null, boolean, boolean]

  // custom erc20 token management
  "pri(tokens.erc20.custom)": [null, Record<CustomErc20Token["id"], CustomErc20Token>]
  "pri(tokens.erc20.custom.byid)": [RequestIdOnly, CustomErc20Token]
  "pri(tokens.erc20.custom.add)": [CustomErc20TokenCreate, boolean]
  "pri(tokens.erc20.custom.remove)": [RequestIdOnly, boolean]
  "pri(tokens.erc20.custom.clear)": [
    { chainId?: ChainId; evmNetworkId?: number } | undefined,
    boolean
  ]

  // transaction message signatures
  "pri(transactions.byid.subscribe)": [RequestIdOnly, boolean, any]
  "pri(transactions.subscribe)": [null, boolean, any]

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

// talisman types --------------
export interface RequestOnboard {
  name: string
  pass: string
  passConfirm: string
  mnemonic?: string
}

export interface RequestLogin {
  pass: string
}

export interface RequestRoute {
  route: string
}

export interface SigningRequest extends PolkadotSigningRequest {
  request: PolkadotSigningRequest["request"]
  account: AccountJson | AccountJsonHardware
}

export interface EthBaseSignRequest extends Omit<SigningRequest, "request" | "account"> {
  ethChainId: number
  account: AccountJson
  type: "ethereum"
  method: "eth_sendTransaction" | "eth_sign"
  request: any
}

export interface EthSignRequest extends EthBaseSignRequest {
  request: string
  method: "eth_sign"
}

export interface EthSignAndSendRequest extends EthBaseSignRequest {
  request: EthTransactionRequest
  method: "eth_sendTransaction"
}

export type AnySigningRequest = SigningRequest | EthSignAndSendRequest | EthSignRequest

export type EthResponseSign = string

export interface AccountJsonHardware extends AccountJson {
  isHardware: true
  accountIndex: number
  addressOffset: number
  genesisHash: string
}

export type AccountJsonAny = AccountJsonHardware | AccountJson

export type IdenticonType = "talisman-orb" | "polkadot-identicon"

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

export type ChainId = string

export type Chain = {
  id: ChainId // The ID of this chain
  isTestnet: boolean // Is this chain a testnet?
  sortIndex: number | null // The sortIndex of this chain
  genesisHash: string | null // The genesisHash of this chain
  prefix: number | null // The substrate prefix of this chain
  name: string | null // The name of this chain
  chainName: string // The on-chain name of this chain
  implName: string | null // The implementation name of this chain
  specName: string | null // The spec name of this chain
  specVersion: string | null // The spec version of this chain
  nativeToken: { id: TokenId } | null // The nativeToken of this chain
  tokens: Array<{ id: TokenId }> | null // The ORML tokens for this chain
  account: string | null // The account address format of this chain
  subscanUrl: string | null // The subscan endpoint of this chain
  rpcs: Array<SubstrateRpc> | null // Some public RPCs for connecting to this chain's network
  isHealthy: boolean // The health status of this chain's RPCs
  evmNetworks: Array<{ id: EvmNetworkId }>

  parathreads?: Chain[] // The parathreads of this relayChain, if some exist

  paraId: number | null // The paraId of this chain, if it is a parachain
  relay?: Chain // The parent relayChain of this parachain, if this chain is a parachain
}

export type SubstrateRpc = {
  url: string // The url of this RPC
  isHealthy: boolean // The health status of this RPC
}

export type EthereumRpc = {
  url: string // The url of this ethereum RPC
  isHealthy: boolean // The health status of this ethereum RPC
}

export type ChainList = Record<ChainId, Chain>

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
export type TransactionId = string

export type TransactionStatus = "PENDING" | "SUCCESS" | "ERROR"

export type Transaction = {
  id: string
  from: string
  nonce: string
  hash: string
  chainId: ChainId
  blockHash?: string
  blockNumber?: string
  extrinsicIndex?: number
  status: TransactionStatus
  message?: string
  createdAt: number
}

export type TransactionList = Record<TransactionId, Transaction>

// event types ------------------------------

export type Event = {
  section: string
  method: string
  docs: string
  phase: Phase
  data: Codec[] & IEventData
  types: TypeDef[]
}

export type EventList = Event[]

// orml tokens types -----------------------

export type TokenList = Record<TokenId, Token>

export type TokenId = string

export type Token = NativeToken | CustomNativeToken | OrmlToken | Erc20Token | CustomErc20Token
export type IToken = {
  id: TokenId
  type: string
  isTestnet: boolean
  symbol: string
  decimals: number
  coingeckoId?: string
  rates?: TokenRates
}
export type NativeToken = IToken & {
  type: "native"
  existentialDeposit: string
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null
}
export type CustomNativeToken = NativeToken & {
  isCustom: true
}
export type OrmlToken = IToken & {
  type: "orml"
  existentialDeposit: string
  stateKey: `0x${string}`
  chain: { id: ChainId }
}
export type Erc20Token = IToken & {
  type: "erc20"
  contractAddress: string
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null
}
export type CustomErc20Token = Erc20Token & {
  isCustom: true
  image?: string
}
export type CustomErc20TokenCreate = Pick<
  CustomErc20Token,
  "symbol" | "decimals" | "coingeckoId" | "contractAddress" | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }

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

export type TokenRateCurrency = keyof TokenRates
export type TokenRates = {
  /** us dollar rate */
  usd: number | null

  /** australian dollar rate */
  aud: number | null

  /** new zealand dollar rate */
  nzd: number | null

  /** canadian dollar rate */
  cud: number | null

  /** hong kong dollar rate */
  hkd: number | null

  /** euro rate */
  eur: number | null

  /** british pound sterling rate */
  gbp: number | null

  /** japanese yen rate */
  jpy: number | null

  /** south korean won rate */
  krw: number | null

  /** chinese yuan rate */
  cny: number | null

  /** btc rate */
  btc: number | null

  /** eth rate */
  eth: number | null

  /** dot rate */
  dot: number | null
}

// balance types ----------------------------

export { Balances, Balance, BalanceFormatter } from "@core/domains/balances/types"

export type BalancesStorage = Record<string, BalanceStorage>

export type BalanceStorage = BalanceStorageBalances | BalanceStorageOrmlTokens | BalanceStorageErc20

export type BalancePallet = BalanceStorage["pallet"]
export type BalanceStatus = "live" | "cache"

export type BalanceStorageBalances = {
  // TODO: Rename `pallet` to `source`? Also, rename `balances` to `native`.
  // Since we now have evm networks, some balances with the `balances` pallet are actually
  // native balances on evm. So there's no pallet involved.
  // Also, erc20 balances might be from an evm network, in which case there's also no pallet involved.
  pallet: "balances"

  status: BalanceStatus

  address: Address
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
  reserved: string
  miscFrozen: string
  feeFrozen: string
}

export type BalanceStorageOrmlTokens = {
  pallet: "orml-tokens"

  status: BalanceStatus

  address: Address
  chainId: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
  reserved: string
  frozen: string
}

export type BalanceStorageErc20 = {
  pallet: "erc20"

  status: BalanceStatus

  address: Address
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId

  free: string
}

export type BalancesUpdate = BalancesUpdateReset | BalancesUpdateUpsert | BalancesUpdateDelete
export type BalancesUpdateReset = { type: "reset"; balances: BalancesStorage }
export type BalancesUpdateUpsert = { type: "upsert"; balances: BalancesStorage }
export type BalancesUpdateDelete = { type: "delete"; balances: string[] }

export interface RequestBalance {
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
  tokenId: TokenId
  address: Address
}

export interface RequestBalancesByParamsSubscribe {
  addressesByChain: AddressesByChain
}

// like a boolean, but can have an unknown value (pending/not-yet-found state)
export type trilean = true | false | null

export type OnboardedType = "FALSE" | "TRUE" | "UNKNOWN"
export type LoggedinType = "FALSE" | "TRUE" | "UNKNOWN"

// defines a asset type
export type AssetType = {
  chainId: string
  name: string
  symbol: string
  decimals: string
}

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

// eth fees types ----------------------------------

export type EthPriorityOptionName = "low" | "medium" | "high"
export type EthPriorityOptions = Record<EthPriorityOptionName, BigNumber>

// Asset Transfer Messages
export interface RequestAssetTransfer {
  chainId: ChainId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount: string
  tip: string
  reapBalance?: boolean
}

export interface RequestAssetTransferApproveSign {
  id: string
  signature: `0x${string}` | Uint8Array
}

export interface ResponseAssetTransfer {
  id: string
}

export interface ResponseAssetTransferFeeQuery {
  partialFee: string
  pendingTransferId?: string
  unsigned: SignerPayloadJSON
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
