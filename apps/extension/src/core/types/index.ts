import { AccountsMessages, MnemonicMessages } from "@core/domains/accounts/types"
import { AppMessages } from "@core/domains/app/types"
import { BalancesMessages } from "@core/domains/balances/types"
import { ChainsMessages } from "@core/domains/chains/types"
import { EncryptMessages } from "@core/domains/encrypt/types"
import { EthMessages } from "@core/domains/ethereum/types"
import { SigningMessages } from "@core/domains/signing/types"
import { AuthorisedSiteMessages } from "@core/domains/sitesAuthorised/types"
import { TokenRatesMessages } from "@core/domains/tokenRates/types"
import { TokenMessages } from "@core/domains/tokens/types"
import { AssetTransferMessages } from "@core/domains/transactions/types"
import type { RequestSignatures as PolkadotRequestSignatures } from "@polkadot/extension-base/background/types"

import type { IdOnlyValues, NoUndefinedValues, NullKeys, RequestIdOnly } from "./base"

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
  | "pri(derivation.create)"
  | "pri(derivation.validate)"
  | "pri(accounts.changePassword)"
  | "pri(seed.validate)"
  | "pub(authorize.tab)"

type RequestSignaturesBase = Omit<PolkadotRequestSignatures, RemovedMessages> &
  AuthorisedSiteMessages &
  AccountsMessages &
  AppMessages &
  AssetTransferMessages &
  BalancesMessages &
  ChainsMessages &
  EthMessages &
  MnemonicMessages &
  SigningMessages &
  TokenMessages &
  TokenRatesMessages &
  EncryptMessages

export interface RequestSignatures extends RequestSignaturesBase {
  // Values for RequestSignatures are arrays where the items are [RequestType, ResponseType, SubscriptionMesssageType?]

  "pri(unsubscribe)": [RequestIdOnly, null]
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
