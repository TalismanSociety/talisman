import type { AccountProxiesMessages } from "../domains/accountProxies/types"
import type { AccountsMessages } from "../domains/accounts/types"
import type { AppMessages } from "../domains/app/types"
import type { AssetDiscoveryMessages } from "../domains/assetDiscovery/types"
import type { BalancesMessages } from "../domains/balances/types"
import type { BitcoinMessages } from "../domains/bitcoin/types"
import type { BittensorMessages } from "../domains/bittensor/types"
import type { ChaindataMessages } from "../domains/chaindata/types"
import type { ChainsMessages } from "../domains/chains/types"
import type { DefiMessages } from "../domains/defi/types"
import type { EarnMessages } from "../domains/earn/types"
import type { EncryptMessages } from "../domains/encrypt/types"
import type { EthMessages } from "../domains/ethereum/types"
import type { GandalfMessages } from "../domains/gandalf/types"
import type { MetadataMessages } from "../domains/metadata/types"
import type { MnemonicMessages } from "../domains/mnemonics/types"
import type { NftsMessages } from "../domains/nfts"
import type { QueryCacheMessages } from "../domains/queryCache/types"
import type { SendFundsMessages } from "../domains/sendFunds/types"
import type { SigningMessages } from "../domains/signing/types"
import type { AuthorisedSiteMessages } from "../domains/sitesAuthorised/types"
import type { SolanaExtensionMessages } from "../domains/solana"
import type { SolanaTabsMessages } from "../domains/solana/types.tabs"
import type { SubstrateMessages } from "../domains/substrate/types"
import type { TalismanMessages } from "../domains/talisman/types"
import type { TokenRatesMessages } from "../domains/tokenRates/types"
import type { IdOnlyValues, NoUndefinedValues, NullKeys, Port, RequestIdOnly } from "./base"
import type { RequestSignatures as PolkadotRequestSignatures } from "./pjsInterop"

export declare type RequestTypes = {
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}

declare type RequestTypesArray = {
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}[MessageTypes]

export declare type ResponseTypes = {
  [MessageType in MessageTypes]: AllMessages[MessageType][1]
}

export declare type SubscriptionMessageTypes = NoUndefinedValues<{
  [MessageType in MessageTypes]: AllMessages[MessageType][2]
}>

declare type KnownSubscriptionMessageTypes<T extends MessageTypes> = NoUndefinedValues<{
  [K in T]: AllMessages[K][2]
}>

export declare type KnownSubscriptionDataTypes<T extends MessageTypes> = AllMessages[T][2]

export declare type RequestIdOnlyMessageTypes = IdOnlyValues<{
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}>

// lists all the messages (public and private) supported by the extension
// PolkadotRequestSignatures only carries the legacy polkadot-js pub() dapp protocol,
// the messages it overlapped with are defined in the Talisman domain maps below
type AllMessages = PolkadotRequestSignatures &
  AccountsMessages &
  AccountProxiesMessages &
  AppMessages &
  AuthorisedSiteMessages &
  BalancesMessages &
  ChainsMessages &
  EncryptMessages &
  EthMessages &
  MetadataMessages &
  MnemonicMessages &
  SigningMessages &
  TalismanMessages &
  TokenRatesMessages &
  SubstrateMessages &
  SolanaExtensionMessages &
  SolanaTabsMessages &
  BitcoinMessages &
  AssetDiscoveryMessages &
  NftsMessages &
  DefiMessages &
  EarnMessages &
  PingMessages &
  ChaindataMessages &
  BittensorMessages &
  GandalfMessages &
  SendFundsMessages &
  QueryCacheMessages &
  UnsubscribeMessages

interface PingMessages {
  // keeps the background script alive while the UI is open
  "pri(keepalive)": [null, boolean]
  // keeps the wallet unlocked while the user is actively interacting with it (clicks/keypresses)
  "pri(keepunlocked)": [null, boolean]
}

interface UnsubscribeMessages {
  "pri(unsubscribe)": [RequestIdOnly, null]
}

export declare type MessageTypes = keyof AllMessages

export declare type MessageTypesWithNullRequest = NullKeys<RequestTypes>

export declare type OriginTypes = "talisman-page" | "talisman-extension"

export interface TransportRequestMessage<TMessageType extends MessageTypes> {
  id: string
  message: TMessageType
  origin: OriginTypes
  request: RequestType<TMessageType>
}

export declare type MessageTypesWithSubscriptions = keyof SubscriptionMessageTypes
export declare type MessageTypesWithSubscriptionsById = keyof RequestIdOnlyMessageTypes &
  MessageTypesWithSubscriptions

export declare type MessageTypesWithNoSubscriptions = Exclude<
  MessageTypes,
  keyof SubscriptionMessageTypes
>

declare type TabMessageTypesWithNoSubscriptions = Exclude<
  MessageTypes,
  keyof SubscriptionMessageTypes
> &
  `pub(${string})`

export type MessageHandler<
  TMessageType extends MessageTypesWithNoSubscriptions,
  Req = RequestType<TMessageType>,
  Res = ResponseType<TMessageType>,
> = (req: Req) => Res | Promise<Res>

export type TabMessageHandler<
  TMessageType extends TabMessageTypesWithNoSubscriptions,
  Req = RequestType<TMessageType>,
  Res = ResponseType<TMessageType>,
> = (req: Req, url: string, port: Port) => Res | Promise<Res>

export type TabSubscriptionHandler<
  TMessageType extends MessageTypesWithSubscriptions,
  Req = RequestType<TMessageType>,
  Res = ResponseType<TMessageType>,
> = (id: string, url: string, port: chrome.runtime.Port, req: Req) => Res | Promise<Res>

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
  timestamp?: number
}

export declare type TransportResponseMessage<TMessageType extends MessageTypes> =
  TMessageType extends MessageTypesWithNoSubscriptions
    ? TransportResponseMessageNoSub<TMessageType>
    : TMessageType extends MessageTypesWithSubscriptions
      ? TransportResponseMessageSub<TMessageType>
      : never

export declare type RequestType<TMessageType extends MessageTypes> = AllMessages[TMessageType][0]

export declare type ResponseType<TMessageType extends MessageTypes> = AllMessages[TMessageType][1]

/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void

export interface SendRequest {
  <TMessageType extends MessageTypesWithNullRequest>(
    message: TMessageType
  ): Promise<ResponseTypes[TMessageType]>
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

declare type CachedUnlocks = Record<string, number>
