import type {
  RequestAuthorizeTab as PolkadotRequestAuthorizeTab,
  RequestSignatures as PolkadotRequestSignatures,
  AccountJson,
  ResponseAccountExport,
  RequestAuthorizeSubscribe,
  RequestAccountSubscribe,
  RequestSigningSubscribe,
  SigningRequest as PolkadotSigningRequest,
  RequestMetadataSubscribe,
  MetadataRequest,
  RequestAccountCreateHardware,
  RequestSigningApproveSignature,
} from "@polkadot/extension-base/background/types"
import { Runtime } from "webextension-polyfill"
import type { ExtrinsicStatus, Hash, Phase } from "@polkadot/types/interfaces"
import type { TransactionRequest as EthTransactionRequest } from "@ethersproject/abstract-provider"
import type { JsonRpcProvider } from "@ethersproject/providers"
import type { GenericEventData } from "@polkadot/types"
import { AnyEthRequest, EthProviderMessage, EthResponseTypes } from "./injectEth/types"
import type { SignerPayloadJSON, SignerPayloadRaw, TypeDef } from "@polkadot/types/types"
import { BigNumber } from "ethers"
export type {
  ExtrinsicStatus,
  Hash,
  MetadataRequest,
  RequestAccountCreateHardware,
  RequestSigningApproveSignature,
  AccountJson,
  SignerPayloadJSON,
  SignerPayloadRaw,
} // Make this available elsewhere also

export type {
  AllowedPath,
  RequestAccountList,
  RequestRpcSend,
  RequestRpcSubscribe,
  RequestRpcUnsubscribe,
  ResponseRpcListProviders,
  ResponseSigning,
  RequestAccountBatchExport,
  RequestAccountChangePassword,
  RequestAccountCreateExternal,
  RequestAccountCreateSuri,
  RequestAccountEdit,
  RequestAccountShow,
  RequestAccountTie,
  RequestAccountValidate,
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
  ResponseAccountExport,
  ResponseDeriveValidate,
  ResponseJsonGetAccountInfo,
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
  era: { ImmortalEra: string }
  nonce: string
  signer: string
  tip: string
  isBatch: boolean
  batch?: TransactionMethodDetails[]
  payment: { class: string; partialFee: string; weight: number }
}

export declare type Port = chrome.runtime.Port | Runtime.Port

// Have to replicate these utils here because polkadot does not export them
declare type IsNull<T, K extends keyof T> = {
  [K1 in Exclude<keyof T, K>]: T[K1]
} & T[K] extends null
  ? K
  : never
declare type NullKeys<T> = {
  [K in keyof T]: IsNull<T, K>
}[keyof T]
declare type KeysWithDefinedValues<T> = {
  [K in keyof T]: T[K] extends undefined ? never : K
}[keyof T]
declare type NoUndefinedValues<T> = {
  [K in KeysWithDefinedValues<T>]: T[K]
}

declare type KeysWithIdOnlyValues<T> = {
  [K in keyof T]: T[K] extends RequestIdOnly ? K : never
}[keyof T]

declare type IdOnlyValues<T> = {
  [K in KeysWithIdOnlyValues<T>]: T[K]
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

export declare type RequestIdOnly = {
  id: string
}

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

type RemovedMessages =
  | "pri(signing.approve.password)"
  | "pri(signing.approve.signature)"
  | "pri(authorize.list)"
  | "pri(authorize.requests)"
  | "pri(accounts.create.suri)"
  | "pri(accounts.create.hardware)"
  | "pri(accounts.export)"
  | "pri(accounts.subscribe)"
  | "pri(signing.requests)"
  | "pri(metadata.requests)"
  | "pri(derivation.create)"
  | "pri(derivation.validate)"
  | "pri(accounts.changePassword)"
  | "pri(seed.validate)"

export interface RequestSignatures extends Omit<PolkadotRequestSignatures, RemovedMessages> {
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

  // mnemonic message signatures
  "pri(mnemonic.unlock)": [string, string]
  "pri(mnemonic.confirm)": [boolean, boolean]
  "pri(mnemonic.subscribe)": [null, boolean, MnemonicSubscriptionResult]
  "pri(mnemonic.address)": [RequestAddressFromMnemonic, string]

  // account message signatures
  "pri(accounts.create)": [RequestAccountCreate, boolean]
  "pri(accounts.create.seed)": [RequestAccountCreateFromSeed, boolean]
  "pri(accounts.create.json)": [RequestAccountCreateFromJson, boolean]
  "pri(accounts.create.hardware)": [Omit<RequestAccountCreateHardware, "hardwareType">, boolean]
  "pri(accounts.forget)": [RequestAccountForget, boolean]
  "pri(accounts.export)": [RequestAccountExport, ResponseAccountExport]
  "pri(accounts.rename)": [RequestAccountRename, boolean]
  "pri(accounts.subscribe)": [RequestAccountSubscribe, boolean, AccountJson[]]
  "pri(accounts.validateMnemonic)": [string, boolean]

  // balance message signatures
  "pri(balances)": [null, any]
  "pri(balances.subscribe)": [null, boolean, BalancesUpdate]
  "pri(balances.byid.subscribe)": [RequestIdOnly, boolean, BalanceStorage]
  "pri(balances.get)": [RequestBalance, BalanceStorage]
  "pri(balances.byparams.subscribe)": [RequestBalancesByParamsSubscribe, boolean, BalancesUpdate]

  // authorized sites message signatures
  "pri(sites.list)": [null, AuthUrls]
  "pri(sites.subscribe)": [null, boolean, AuthUrls]
  "pri(sites.byid)": [RequestIdOnly, AuthorizedSite]
  "pri(sites.byid.subscribe)": [RequestIdOnly, boolean, AuthorizedSite]
  "pri(sites.forget)": [RequestAuthorizedSiteForget, boolean]
  "pri(sites.update)": [RequestAuthorizedSiteUpdate, boolean]

  // authorization requests message signatures
  "pri(sites.requests.subscribe)": [RequestAuthorizeSubscribe, boolean, AuthorizeRequest[]]
  "pri(sites.requests.approve)": [AuthRequestApprove, boolean]
  "pri(sites.requests.reject)": [RequestIdOnly, boolean]
  "pri(sites.requests.ignore)": [RequestIdOnly, boolean]

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
  "pri(chains)": [null, ChainList]
  "pri(chains.byid)": [RequestIdOnly, Chain]
  "pri(chains.subscribe)": [null, boolean, ChainList]
  "pri(chains.byid.subscribe)": [RequestIdOnly, boolean, Chain]

  // token message signatures
  "pri(tokens)": [null, TokenList]
  "pri(tokens.byid)": [RequestIdOnly, Token]
  "pri(tokens.subscribe)": [null, boolean, TokenList]
  "pri(tokens.byid.subscribe)": [RequestIdOnly, boolean, Token]

  // transaction message signatures
  "pri(transactions.byid.subscribe)": [RequestIdOnly, boolean, any]
  "pri(transactions.subscribe)": [null, boolean, any]

  // metadata message signatures
  "pri(metadata.requests)": [RequestMetadataSubscribe, boolean, MetadataRequest[]]

  // all ethereum calls
  "pub(eth.request)": [AnyEthRequest, EthResponseTypes]
  "pub(eth.subscribe)": [null, boolean, EthProviderMessage]
  // eth signing message signatures
  "pri(eth.request)": [AnyEthRequestChainId, EthResponseTypes]
  "pri(eth.signing.cancel)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSign)": [RequestIdOnly, boolean]
  "pri(eth.signing.approveSignAndSend)": [EthApproveSignAndSend, boolean]
  // eth add networks management
  "pri(eth.networks.add.requests)": [null, AddEthereumChainRequest[]]
  "pri(eth.networks.add.approve)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.cancel)": [RequestIdOnly, boolean]
  "pri(eth.networks.add.subscribe)": [null, boolean, AddEthereumChainRequest[]]

  // ethereum networks message signatures
  "pri(eth.networks)": [null, EthereumNetworkList]
  "pri(eth.networks.byid)": [RequestIdOnly, EthereumNetwork]
  "pri(eth.networks.subscribe)": [null, boolean, EthereumNetworkList]
  "pri(eth.networks.byid.subscribe)": [RequestIdOnly, boolean, EthereumNetwork]
  "pri(eth.networks.add.custom)": [EthereumNetwork, boolean]
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

export interface RequestAccountCreate {
  name: string
}

export interface RequestLogin {
  pass: string
}

export interface RequestAuthorizeTab extends PolkadotRequestAuthorizeTab {
  name?: string
  ethereum?: boolean
}
export interface RequestRoute {
  route: string
}

export interface AuthorizeRequest {
  id: string
  request: RequestAuthorizeTab
  url: string
}

export interface AccountMeta extends AccountJson {
  name: string
  origin: "ROOT" | "DERIVED" | "SEED" | "JSON"
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
  provider: JsonRpcProvider
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

export type AccountAddressType = "sr25519" | "ethereum"

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

export type Address = string

// Addresses is a record where the keys are the address itself, and the values are an array of chain genesis hashes, or null if the address may have
// balances on any chain
export type Addresses = Record<Address, Array<string> | null>
export type AddressesByChain = { [chainId: string]: Address[] }
export type AddressList = Address[]

export interface Account {
  address: Address
  meta: AccountMeta
}

export type ChainId = string

export type Chain = {
  id: ChainId // The ID of this chain
  sortIndex: number | null // The sortIndex of this chain
  isTestnet: boolean // Is this chain a testnet?
  genesisHash: string | null // The genesisHash of this chain
  prefix: number | null // The substrate prefix of this chain
  name: string | null // The name of this chain
  chainName: string // The on-chain name of this chain
  implName: string | null // The implementation name of this chain
  specName: string | null // The spec name of this chain
  specVersion: string | null // The spec version of this chain
  nativeToken: { id: TokenId } | null // The nativeToken of this chain
  tokensCurrencyIdIndex: number | null // The CurrencyId::Token index of this chain. Used to id orml tokens when communicating with the chain.
  tokens: Array<{ id: TokenId }> | null // The ORML tokens for this chain
  account: string | null // The account address format of this chain
  subscanUrl: string | null // The subscan endpoint of this chain
  rpcs: Array<Rpc> | null // Some public RPCs for connecting to this chain's network
  ethereumExplorerUrl: string | null
  ethereumRpcs: Array<EthereumRpc> | null
  ethereumId: number | null
  isHealthy: boolean // The health status of this chain's RPCs

  parathreads?: Chain[] // The parathreads of this relayChain, if some exist

  paraId: number | null // The paraId of this chain, if it is a parachain
  relay?: Chain // The parent relayChain of this parachain, if this chain is a parachain
}

export type Rpc = {
  url: string // The url of this RPC
  isHealthy: boolean // The health status of this RPC
}

export type EthereumRpc = {
  url: string // The url of this ethereum RPC
  isHealthy: boolean // The health status of this ethereum RPC
}

export type ChainList = Record<ChainId, Chain>

export type EthereumNetwork = {
  id: number
  name: string
  // TODO: Create ethereum tokens store (and reference here by id).
  //       Or extend substrate tokens store to support both substrate and ethereum tokens.
  nativeToken?: {
    name: string
    symbol: string
    decimals: number
  }
  rpcs: EthereumRpc[]
  explorerUrls: string[]
  iconUrls: string[]
  /** Was this network added by a dapp or does it come from chaindata? */
  isCustom: boolean
}

export type EthereumNetworkList = Record<number, EthereumNetwork>

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
  data: GenericEventData
  types: TypeDef[]
}

export type EventList = Event[]

// orml tokens types -----------------------

export type TokenList = Record<TokenId, Token>

export type TokenId = string

export type TokenIndex = number

export type Token = NativeToken | OrmlToken
export type NativeToken = {
  type: "native"
  id: TokenId
  name: string
  chainId: ChainId
  /** @deprecated - use token.symbol */
  token: string
  symbol: string
  decimals: number
  existentialDeposit: string
  coingeckoId: string
  rates: TokenRates
}
export type OrmlToken = {
  type: "orml"
  id: TokenId
  name: string
  chainId: ChainId
  index: TokenIndex
  /** @deprecated - use token.symbol */
  token: string
  symbol: string
  decimals: number
  existentialDeposit: string
  coingeckoId: string
  rates: TokenRates
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

export type BalanceStorage = BalanceStorageBalances | BalanceStorageOrmlTokens

export type BalancePallet = BalanceStorage["pallet"]
export type BalanceStatus = "live" | "cache"

export type BalanceStorageBalances = {
  pallet: "balances"

  status: BalanceStatus

  address: Address
  chainId: ChainId
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
  tokenId: TokenId

  free: string
  reserved: string
  frozen: string
}

export type BalancesUpdate = BalancesUpdateReset | BalancesUpdateUpsert | BalancesUpdateDelete
export type BalancesUpdateReset = { type: "reset"; balances: BalancesStorage }
export type BalancesUpdateUpsert = { type: "upsert"; balances: BalancesStorage }
export type BalancesUpdateDelete = { type: "delete"; balances: string[] }

export interface RequestBalance {
  chainId: ChainId
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

// do we need this?
export declare type AssetTypeWithParent = AssetType & {
  relay?: AssetType
}

export declare type MnemonicSubscriptionResult = {
  confirmed?: boolean
}

export declare type RequestAddressFromMnemonic = {
  mnemonic: string
  type?: AccountAddressType
}

export interface Resolver<T> {
  reject: (error: Error) => void
  resolve: (result: T) => void
}

// account types ----------------------------------
export type AccountsList = Account[]

export interface RequestAccountCreate {
  name: string
}

export interface RequestAccountCreateFromSeed {
  name: string
  seed: string
  type?: AccountAddressType
}

export interface RequestAccountCreateFromJson {
  json: string
  password: string
}

export interface RequestAccountForget {
  address: string
}

export interface RequestAccountExport {
  address: string
}

export interface RequestAccountRename {
  address: string
  name: string
}

// authorize request types ----------------------------------
export type AuthRequestId = string
export type AuthRequestAddress = string
export type AuthRequestAddresses = AuthRequestAddress[]

export type AuthRequestApprove = {
  id: string
  addresses: AuthRequestAddresses
  ethChainId?: number
}

export interface AuthRequestBase {
  id: string
  idStr: string
  request: RequestAuthorizeTab
  url: string
}

export type AuthRequestResponse = { addresses: AuthRequestAddresses; ethChainId?: number }
export type AuthRequest = Resolver<AuthRequestResponse> & AuthRequestBase

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

// authorized site types ----------------------------------

export declare type AuthorizedSiteId = string
export declare type AuthorizedSiteAddress = string
export declare type AuthorizedSiteAddresses = AuthorizedSiteAddress[]

export declare type AuthorizedSites = Record<string, AuthorizedSite>
export declare type AuthUrls = AuthorizedSites

export type AuthorizedSite = {
  id: string
  addresses?: AuthorizedSiteAddresses
  ethAddresses?: AuthorizedSiteAddresses
  origin: string
  url: string
  ethChainId?: number
}

export type ProviderType = "polkadot" | "ethereum"

export declare type RequestAuthorizedSiteUpdate = {
  id: string
  props: Omit<Partial<AuthorizedSite>, "id">
}
export declare type RequestAuthorizedSiteForget = { id: string; type: ProviderType }

// Asset Transfer Messages
export interface RequestAssetTransfer {
  chainId: ChainId
  tokenId: TokenId
  fromAddress: string
  toAddress: string
  amount: string
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
