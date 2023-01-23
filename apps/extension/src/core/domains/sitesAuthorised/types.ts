import { RequestIdOnly, Resolver } from "@core/types/base"
import type {
  RequestAuthorizeTab as PolkadotRequestAuthorizeTab,
  RequestAuthorizeSubscribe,
} from "@polkadot/extension-base/background/types"

import { Web3WalletPermission, Web3WalletPermissionTarget } from "../ethereum/types"

export interface RequestAuthorizeTab extends PolkadotRequestAuthorizeTab {
  name?: string
  ethereum?: boolean
}

// authorize request types ----------------------------------

export type AuthRequestId = string
export type AuthRequestAddress = string
export type AuthRequestAddresses = AuthRequestAddress[]

export type AuthRequestApprove = {
  id: string
  addresses: AuthRequestAddresses
}

export interface AuthRequestBase {
  id: string
  idStr: string
  request: RequestAuthorizeTab
  url: string
}

export type AuthRequestResponse = { addresses: AuthRequestAddresses }
export type AuthRequest = Resolver<AuthRequestResponse> & AuthRequestBase

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
  origin: string
  url: string
  ethChainId?: number
  connectAllSubstrate?: boolean
}

export type ProviderType = "polkadot" | "ethereum"

export declare type AuthorisedSiteUpdate = Omit<Partial<AuthorizedSite>, "id">

export declare type RequestAuthorizedSiteUpdate = {
  id: string
  authorisedSite: AuthorisedSiteUpdate
}

export declare type RequestAuthorizedSiteForget = { id: string; type: ProviderType }

export interface AuthorizeRequest {
  id: string
  request: RequestAuthorizeTab
  url: string
}

// authorized sites message signatures
export interface AuthorisedSiteMessages {
  // authorization requests message signatures
  "pri(sites.requests.subscribe)": [RequestAuthorizeSubscribe, boolean, AuthorizeRequest[]]
  "pri(sites.requests.approve)": [AuthRequestApprove, boolean]
  "pri(sites.requests.reject)": [RequestIdOnly, boolean]
  "pri(sites.requests.ignore)": [RequestIdOnly, boolean]

  // authorised sites message signatures
  "pri(sites.list)": [null, AuthUrls]
  "pri(sites.subscribe)": [null, boolean, AuthUrls]
  "pri(sites.byid)": [RequestIdOnly, AuthorizedSite]
  "pri(sites.byid.subscribe)": [RequestIdOnly, boolean, AuthorizedSite]
  "pri(sites.forget)": [RequestAuthorizedSiteForget, boolean]
  "pri(sites.update)": [RequestAuthorizedSiteUpdate, boolean]

  // public messages
  "pub(authorize.tab)": [RequestAuthorizeTab, boolean]
}
