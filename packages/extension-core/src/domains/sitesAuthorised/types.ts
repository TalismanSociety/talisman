import type { RequestAuthorizeTab as PolkadotRequestAuthorizeTab } from "@polkadot/extension-base/background/types"
import { SolanaSignInInput } from "@solana/wallet-standard-features"
import { Account } from "@talismn/keyring"

import { KnownRequestId } from "../../libs/requests/types"
import { BaseRequest, BaseRequestId, RequestIdOnly } from "../../types/base"
import { Web3WalletPermission, Web3WalletPermissionTarget } from "../ethereum/types"

export interface RequestAuthorizeTab extends PolkadotRequestAuthorizeTab {
  name?: string
  provider: ProviderType
}

// new authorise request types
export type AUTH_PREFIX = "auth"
export const AUTH_PREFIX: AUTH_PREFIX = "auth"
export type AuthRequestId = BaseRequestId<AUTH_PREFIX>
export interface SiteAuthRequest extends BaseRequest<AUTH_PREFIX> {
  id: AuthRequestId
  idStr: string
  request: RequestAuthorizeTab
  url: string
}

export const AUTH_SOL_SIGN_IN_PREFIX = "auth-sol-signIn"
export interface AuthSolanaSignInRequest extends BaseRequest<typeof AUTH_SOL_SIGN_IN_PREFIX> {
  input?: SolanaSignInInput
  url: string
}
export type AuthSolanaSignInResponse = {
  account: Account
  message: string // message to be signed as part of the sign-in process
  signature: string
}

export type SitesAuthRequests = {
  "auth": [SiteAuthRequest, AuthRequestResponse]
  "auth-sol-signIn": [AuthSolanaSignInRequest, AuthSolanaSignInResponse]
}

// authorize request types ----------------------------------

export type AuthRequestAddress = string
export type AuthRequestAddresses = AuthRequestAddress[]

export type AuthRequestApprove = {
  id: AuthRequestId
  addresses: AuthRequestAddresses
}

export type AuthRequestResponse = { addresses: AuthRequestAddresses }

export type AuthSolanaSignInApprove = {
  id: KnownRequestId<"auth-sol-signIn">
  result: {
    address: string
    message: string // message to be signed as part of the sign-in process
    signature?: string // optional hardware signer signature
  }
}

// authorized site types ----------------------------------

export declare type AuthorizedSiteId = string
export declare type AuthorizedSiteAddress = string
export declare type AuthorizedSiteAddresses = AuthorizedSiteAddress[]

export declare type AuthorizedSites = Record<string, AuthorizedSite>
export declare type AuthUrls = AuthorizedSites

export type EthWalletPermissions = Record<
  Web3WalletPermissionTarget,
  Pick<Web3WalletPermission, "date">
>

export type AuthorizedSite = {
  id: string
  addresses?: AuthorizedSiteAddresses
  ethAddresses?: AuthorizedSiteAddresses
  ethPermissions?: EthWalletPermissions
  solAddresses?: string[]
  origin: string
  url: string
  ethChainId?: number
  connectAllSubstrate?: boolean
}

export type ProviderType = "polkadot" | "ethereum" | "solana"

export declare type AuthorisedSiteUpdate = Omit<Partial<AuthorizedSite>, "id">

export declare type RequestAuthorizedSiteUpdate = {
  id: string
  authorisedSite: AuthorisedSiteUpdate
}

export declare type RequestAuthorizedSiteForget = { id: string; type: ProviderType }

export declare type RequestAuthorizedSiteBatchOp = { type: ProviderType }

// authorized sites message signatures
export interface AuthorisedSiteMessages {
  // authorization requests message signatures
  "pri(sites.requests.approve)": [AuthRequestApprove, boolean]
  "pri(sites.requests.reject)": [RequestIdOnly, boolean]
  "pri(sites.requests.ignore)": [RequestIdOnly, boolean]
  "pri(sites.requests.approveSolSignIn)": [AuthSolanaSignInApprove, boolean]

  // authorised sites message signatures
  "pri(sites.list)": [null, AuthUrls]
  "pri(sites.subscribe)": [null, boolean, AuthUrls]
  "pri(sites.byid)": [RequestIdOnly, AuthorizedSite]
  "pri(sites.byid.subscribe)": [RequestIdOnly, boolean, AuthorizedSite]
  "pri(sites.forget)": [RequestAuthorizedSiteForget, boolean]
  "pri(sites.update)": [RequestAuthorizedSiteUpdate, boolean]
  "pri(sites.disconnect.all)": [RequestAuthorizedSiteBatchOp, boolean]
  "pri(sites.forget.all)": [RequestAuthorizedSiteBatchOp, boolean]

  // public messages
  "pub(authorize.tab)": [RequestAuthorizeTab, boolean]
}
