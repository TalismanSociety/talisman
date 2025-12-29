import type { RequestSignatures as PolkadotRequestSignatures } from "@polkadot/extension-base/background/types"

import type { IdOnlyValues, NoUndefinedValues, NullKeys, Port, RequestIdOnly } from "./base"
import { AccountsMessages } from "../domains/accounts/types"
import { AppMessages } from "../domains/app/types"
import { AssetDiscoveryMessages } from "../domains/assetDiscovery/types"
import { BalancesMessages } from "../domains/balances/types"
import { BittensorMessages } from "../domains/bittensor/types"
import { ChainsMessages } from "../domains/chains/types"
import { DefiMessages } from "../domains/defi/types"
import { EncryptMessages } from "../domains/encrypt/types"
import { EthMessages } from "../domains/ethereum/types"
import { MetadataMessages } from "../domains/metadata/types"
import { MnemonicMessages } from "../domains/mnemonics/types"
import { NftsMessages } from "../domains/nfts"
import { SigningMessages } from "../domains/signing/types"
import { AuthorisedSiteMessages } from "../domains/sitesAuthorised/types"
import { SolanaExtensionMessages } from "../domains/solana"
import { SolanaTabsMessages } from "../domains/solana/types.tabs"
import { SubstrateMessages } from "../domains/substrate/types"
import { TalismanMessages } from "../domains/talisman/types"
import { TokenRatesMessages } from "../domains/tokenRates/types"
import { ChaindataMessages, SendFundsMessages } from "./domains"

export declare type RequestTypes = {
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}

export declare type RequestTypesArray = {
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}[MessageTypes]

export declare type ResponseTypes = {
  [MessageType in MessageTypes]: AllMessages[MessageType][1]
}

export declare type SubscriptionMessageTypes = NoUndefinedValues<{
  [MessageType in MessageTypes]: AllMessages[MessageType][2]
}>

export declare type KnownSubscriptionMessageTypes<T extends MessageTypes> = NoUndefinedValues<{
  [K in T]: AllMessages[K][2]
}>

export declare type KnownSubscriptionDataTypes<T extends MessageTypes> = AllMessages[T][2]

export declare type RequestIdOnlyMessageTypes = IdOnlyValues<{
  [MessageType in MessageTypes]: AllMessages[MessageType][0]
}>

type RemovedMessages =
  | "pri(ping)"
  | "pri(signing.approve.password)"
  | "pri(signing.approve.signature)"
  | "pri(authorize.list)"
  | "pri(authorize.requests)"
  | "pri(accounts.create.suri)"
  | "pri(accounts.create.ledger)"
  | "pri(accounts.export)"
  | "pri(accounts.forget)"
  | "pri(accounts.subscribe)"
  | "pri(metadata.requests)"
  | "pri(metadata.approve)"
  | "pri(metadata.get)"
  | "pri(metadata.reject)"
  | "pri(metadata.list)"
  | "pri(signing.cancel)"
  | "pri(signing.requests)"
  | "pri(derivation.create)"
  | "pri(derivation.validate)"
  | "pri(accounts.changePassword)"
  | "pri(seed.validate)"
  | "pub(authorize.tab)"

// lists all the messages (public and private) supported by the extension
type AllMessages = Omit<PolkadotRequestSignatures, RemovedMessages> &
  AccountsMessages &
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
  AssetDiscoveryMessages &
  NftsMessages &
  DefiMessages &
  PingMessages &
  ChaindataMessages &
  BittensorMessages &
  SendFundsMessages &
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

export type SubscriptionHandler<
  TMessageType extends MessageTypesWithSubscriptions,
  Req = RequestType<TMessageType>,
  Res = ResponseType<TMessageType>,
> = (id: string, port: chrome.runtime.Port, req: Req) => Res | Promise<Res>

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
 * A callback with either an error or a result.
 */
export interface SubscriptionCallback<Result> {
  (error: null, result: Result): void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (error: any, result?: never): void
}

/**
 * A function which cancels a subscription when called.
 */
export type UnsubscribeFn = () => void

export interface SendRequest {
  <TMessageType extends MessageTypesWithNullRequest>(
    message: TMessageType,
  ): Promise<ResponseTypes[TMessageType]>
  <TMessageType extends MessageTypesWithNoSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType],
  ): Promise<ResponseTypes[TMessageType]>
  <TMessageType extends MessageTypesWithSubscriptions>(
    message: TMessageType,
    request: RequestTypes[TMessageType],
    subscriber: (data: SubscriptionMessageTypes[TMessageType]) => void,
  ): Promise<ResponseTypes[TMessageType]>
}

export declare type CachedUnlocks = Record<string, number>
