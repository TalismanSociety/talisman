/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core"
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string
  String: string
  Boolean: boolean
  Int: number
  Float: number
  /** A scalar that can represent any JSON value */
  JSON: unknown
}

export type BalanceModuleConfig = {
  moduleConfig: Scalars["JSON"]
  moduleType: Scalars["String"]
}

export type BalanceModuleMetadata = {
  metadata: Scalars["JSON"]
  moduleType: Scalars["String"]
}

export type CachedCoingeckoLogo = {
  id: Scalars["String"]
  lastUpdated: Scalars["String"]
  url: Scalars["String"]
}

export type CachedCoingeckoLogoEdge = {
  cursor: Scalars["String"]
  node: CachedCoingeckoLogo
}

export type CachedCoingeckoLogoOrderByInput =
  | "id_ASC"
  | "id_DESC"
  | "lastUpdated_ASC"
  | "lastUpdated_DESC"
  | "url_ASC"
  | "url_DESC"

export type CachedCoingeckoLogoWhereInput = {
  AND?: InputMaybe<Array<CachedCoingeckoLogoWhereInput>>
  OR?: InputMaybe<Array<CachedCoingeckoLogoWhereInput>>
  id_contains?: InputMaybe<Scalars["String"]>
  id_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_endsWith?: InputMaybe<Scalars["String"]>
  id_eq?: InputMaybe<Scalars["String"]>
  id_gt?: InputMaybe<Scalars["String"]>
  id_gte?: InputMaybe<Scalars["String"]>
  id_in?: InputMaybe<Array<Scalars["String"]>>
  id_isNull?: InputMaybe<Scalars["Boolean"]>
  id_lt?: InputMaybe<Scalars["String"]>
  id_lte?: InputMaybe<Scalars["String"]>
  id_not_contains?: InputMaybe<Scalars["String"]>
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_not_endsWith?: InputMaybe<Scalars["String"]>
  id_not_eq?: InputMaybe<Scalars["String"]>
  id_not_in?: InputMaybe<Array<Scalars["String"]>>
  id_not_startsWith?: InputMaybe<Scalars["String"]>
  id_startsWith?: InputMaybe<Scalars["String"]>
  lastUpdated_contains?: InputMaybe<Scalars["String"]>
  lastUpdated_containsInsensitive?: InputMaybe<Scalars["String"]>
  lastUpdated_endsWith?: InputMaybe<Scalars["String"]>
  lastUpdated_eq?: InputMaybe<Scalars["String"]>
  lastUpdated_gt?: InputMaybe<Scalars["String"]>
  lastUpdated_gte?: InputMaybe<Scalars["String"]>
  lastUpdated_in?: InputMaybe<Array<Scalars["String"]>>
  lastUpdated_isNull?: InputMaybe<Scalars["Boolean"]>
  lastUpdated_lt?: InputMaybe<Scalars["String"]>
  lastUpdated_lte?: InputMaybe<Scalars["String"]>
  lastUpdated_not_contains?: InputMaybe<Scalars["String"]>
  lastUpdated_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  lastUpdated_not_endsWith?: InputMaybe<Scalars["String"]>
  lastUpdated_not_eq?: InputMaybe<Scalars["String"]>
  lastUpdated_not_in?: InputMaybe<Array<Scalars["String"]>>
  lastUpdated_not_startsWith?: InputMaybe<Scalars["String"]>
  lastUpdated_startsWith?: InputMaybe<Scalars["String"]>
  url_contains?: InputMaybe<Scalars["String"]>
  url_containsInsensitive?: InputMaybe<Scalars["String"]>
  url_endsWith?: InputMaybe<Scalars["String"]>
  url_eq?: InputMaybe<Scalars["String"]>
  url_gt?: InputMaybe<Scalars["String"]>
  url_gte?: InputMaybe<Scalars["String"]>
  url_in?: InputMaybe<Array<Scalars["String"]>>
  url_isNull?: InputMaybe<Scalars["Boolean"]>
  url_lt?: InputMaybe<Scalars["String"]>
  url_lte?: InputMaybe<Scalars["String"]>
  url_not_contains?: InputMaybe<Scalars["String"]>
  url_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  url_not_endsWith?: InputMaybe<Scalars["String"]>
  url_not_eq?: InputMaybe<Scalars["String"]>
  url_not_in?: InputMaybe<Array<Scalars["String"]>>
  url_not_startsWith?: InputMaybe<Scalars["String"]>
  url_startsWith?: InputMaybe<Scalars["String"]>
}

export type CachedCoingeckoLogosConnection = {
  edges: Array<CachedCoingeckoLogoEdge>
  pageInfo: PageInfo
  totalCount: Scalars["Int"]
}

export type Chain = {
  /** account format for this chain */
  account: Maybe<Scalars["String"]>
  /** balance metadata for this chain */
  balanceMetadata: Array<BalanceModuleMetadata>
  /** balance module configs for this chain */
  balanceModuleConfigs: Array<BalanceModuleConfig>
  /** chain-specified name for this chain */
  chainName: Maybe<Scalars["String"]>
  /** chainspec qr url for this chain */
  chainspecQrUrl: Maybe<Scalars["String"]>
  /** evm networks on this chain */
  evmNetworks: Array<EvmNetwork>
  /** hash of the first block on this chain */
  genesisHash: Maybe<`0x${Scalars["String"]}`>
  /** the id for this chain (talisman-defined) */
  id: Scalars["String"]
  /** implementation name for this chain */
  implName: Maybe<Scalars["String"]>
  /** health status for this chain */
  isHealthy: Scalars["Boolean"]
  /** is chain this a testnet? */
  isTestnet: Scalars["Boolean"]
  /** does this chain use custom rules to decide on the fee token for txs? */
  isUnknownFeeToken: Scalars["Boolean"]
  /** latest metadata qr url for this chain */
  latestMetadataQrUrl: Maybe<Scalars["String"]>
  /** url of the logo for this chain */
  logo: Maybe<Scalars["String"]>
  /** talisman-defined name for this chain */
  name: Maybe<Scalars["String"]>
  /** native token for this chain */
  nativeToken: Maybe<Token>
  /** paraId for this chain (if this chain is a parachain for another chain) */
  paraId: Maybe<Scalars["Int"]>
  /** parathreads of this chain (if this chain is a relaychain) */
  parathreads: Array<Chain>
  /** ss58 prefix for this chain */
  prefix: Maybe<Scalars["Int"]>
  /** relaychain of this chain (if this chain is a parachain for another chain) */
  relay: Maybe<Chain>
  /** substrate rpcs for this chain (talisman-defined) */
  rpcs: Array<SubstrateRpc>
  /** index for sorting chains and evm networks in a user-friendly way */
  sortIndex: Maybe<Scalars["Int"]>
  /** specification name for this chain */
  specName: Maybe<Scalars["String"]>
  /** specification version for this chain */
  specVersion: Maybe<Scalars["String"]>
  /** subscan endpoint for this chain */
  subscanUrl: Maybe<Scalars["String"]>
  /** a theme color for this chain */
  themeColor: Maybe<Scalars["String"]>
  /** other tokens on this chain */
  tokens: Array<Token>
}

export type ChainEvmNetworksArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<EvmNetworkOrderByInput>>
  where?: InputMaybe<EvmNetworkWhereInput>
}

export type ChainParathreadsArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<ChainOrderByInput>>
  where?: InputMaybe<ChainWhereInput>
}

export type ChainTokensArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<TokenOrderByInput>>
  where?: InputMaybe<TokenWhereInput>
}

export type ChainEdge = {
  cursor: Scalars["String"]
  node: Chain
}

export type ChainOrderByInput =
  | "account_ASC"
  | "account_DESC"
  | "chainName_ASC"
  | "chainName_DESC"
  | "chainspecQrUrl_ASC"
  | "chainspecQrUrl_DESC"
  | "genesisHash_ASC"
  | "genesisHash_DESC"
  | "id_ASC"
  | "id_DESC"
  | "implName_ASC"
  | "implName_DESC"
  | "isHealthy_ASC"
  | "isHealthy_DESC"
  | "isTestnet_ASC"
  | "isTestnet_DESC"
  | "isUnknownFeeToken_ASC"
  | "isUnknownFeeToken_DESC"
  | "latestMetadataQrUrl_ASC"
  | "latestMetadataQrUrl_DESC"
  | "logo_ASC"
  | "logo_DESC"
  | "name_ASC"
  | "name_DESC"
  | "nativeToken_id_ASC"
  | "nativeToken_id_DESC"
  | "paraId_ASC"
  | "paraId_DESC"
  | "prefix_ASC"
  | "prefix_DESC"
  | "relay_account_ASC"
  | "relay_account_DESC"
  | "relay_chainName_ASC"
  | "relay_chainName_DESC"
  | "relay_chainspecQrUrl_ASC"
  | "relay_chainspecQrUrl_DESC"
  | "relay_genesisHash_ASC"
  | "relay_genesisHash_DESC"
  | "relay_id_ASC"
  | "relay_id_DESC"
  | "relay_implName_ASC"
  | "relay_implName_DESC"
  | "relay_isHealthy_ASC"
  | "relay_isHealthy_DESC"
  | "relay_isTestnet_ASC"
  | "relay_isTestnet_DESC"
  | "relay_isUnknownFeeToken_ASC"
  | "relay_isUnknownFeeToken_DESC"
  | "relay_latestMetadataQrUrl_ASC"
  | "relay_latestMetadataQrUrl_DESC"
  | "relay_logo_ASC"
  | "relay_logo_DESC"
  | "relay_name_ASC"
  | "relay_name_DESC"
  | "relay_paraId_ASC"
  | "relay_paraId_DESC"
  | "relay_prefix_ASC"
  | "relay_prefix_DESC"
  | "relay_sortIndex_ASC"
  | "relay_sortIndex_DESC"
  | "relay_specName_ASC"
  | "relay_specName_DESC"
  | "relay_specVersion_ASC"
  | "relay_specVersion_DESC"
  | "relay_subscanUrl_ASC"
  | "relay_subscanUrl_DESC"
  | "relay_themeColor_ASC"
  | "relay_themeColor_DESC"
  | "sortIndex_ASC"
  | "sortIndex_DESC"
  | "specName_ASC"
  | "specName_DESC"
  | "specVersion_ASC"
  | "specVersion_DESC"
  | "subscanUrl_ASC"
  | "subscanUrl_DESC"
  | "themeColor_ASC"
  | "themeColor_DESC"

export type ChainWhereInput = {
  AND?: InputMaybe<Array<ChainWhereInput>>
  OR?: InputMaybe<Array<ChainWhereInput>>
  account_contains?: InputMaybe<Scalars["String"]>
  account_containsInsensitive?: InputMaybe<Scalars["String"]>
  account_endsWith?: InputMaybe<Scalars["String"]>
  account_eq?: InputMaybe<Scalars["String"]>
  account_gt?: InputMaybe<Scalars["String"]>
  account_gte?: InputMaybe<Scalars["String"]>
  account_in?: InputMaybe<Array<Scalars["String"]>>
  account_isNull?: InputMaybe<Scalars["Boolean"]>
  account_lt?: InputMaybe<Scalars["String"]>
  account_lte?: InputMaybe<Scalars["String"]>
  account_not_contains?: InputMaybe<Scalars["String"]>
  account_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  account_not_endsWith?: InputMaybe<Scalars["String"]>
  account_not_eq?: InputMaybe<Scalars["String"]>
  account_not_in?: InputMaybe<Array<Scalars["String"]>>
  account_not_startsWith?: InputMaybe<Scalars["String"]>
  account_startsWith?: InputMaybe<Scalars["String"]>
  balanceMetadata_isNull?: InputMaybe<Scalars["Boolean"]>
  balanceModuleConfigs_isNull?: InputMaybe<Scalars["Boolean"]>
  chainName_contains?: InputMaybe<Scalars["String"]>
  chainName_containsInsensitive?: InputMaybe<Scalars["String"]>
  chainName_endsWith?: InputMaybe<Scalars["String"]>
  chainName_eq?: InputMaybe<Scalars["String"]>
  chainName_gt?: InputMaybe<Scalars["String"]>
  chainName_gte?: InputMaybe<Scalars["String"]>
  chainName_in?: InputMaybe<Array<Scalars["String"]>>
  chainName_isNull?: InputMaybe<Scalars["Boolean"]>
  chainName_lt?: InputMaybe<Scalars["String"]>
  chainName_lte?: InputMaybe<Scalars["String"]>
  chainName_not_contains?: InputMaybe<Scalars["String"]>
  chainName_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  chainName_not_endsWith?: InputMaybe<Scalars["String"]>
  chainName_not_eq?: InputMaybe<Scalars["String"]>
  chainName_not_in?: InputMaybe<Array<Scalars["String"]>>
  chainName_not_startsWith?: InputMaybe<Scalars["String"]>
  chainName_startsWith?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_contains?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_containsInsensitive?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_endsWith?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_eq?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_gt?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_gte?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_in?: InputMaybe<Array<Scalars["String"]>>
  chainspecQrUrl_isNull?: InputMaybe<Scalars["Boolean"]>
  chainspecQrUrl_lt?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_lte?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_not_contains?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_not_endsWith?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_not_eq?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_not_in?: InputMaybe<Array<Scalars["String"]>>
  chainspecQrUrl_not_startsWith?: InputMaybe<Scalars["String"]>
  chainspecQrUrl_startsWith?: InputMaybe<Scalars["String"]>
  evmNetworks_every?: InputMaybe<EvmNetworkWhereInput>
  evmNetworks_none?: InputMaybe<EvmNetworkWhereInput>
  evmNetworks_some?: InputMaybe<EvmNetworkWhereInput>
  genesisHash_contains?: InputMaybe<Scalars["String"]>
  genesisHash_containsInsensitive?: InputMaybe<Scalars["String"]>
  genesisHash_endsWith?: InputMaybe<Scalars["String"]>
  genesisHash_eq?: InputMaybe<Scalars["String"]>
  genesisHash_gt?: InputMaybe<Scalars["String"]>
  genesisHash_gte?: InputMaybe<Scalars["String"]>
  genesisHash_in?: InputMaybe<Array<Scalars["String"]>>
  genesisHash_isNull?: InputMaybe<Scalars["Boolean"]>
  genesisHash_lt?: InputMaybe<Scalars["String"]>
  genesisHash_lte?: InputMaybe<Scalars["String"]>
  genesisHash_not_contains?: InputMaybe<Scalars["String"]>
  genesisHash_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  genesisHash_not_endsWith?: InputMaybe<Scalars["String"]>
  genesisHash_not_eq?: InputMaybe<Scalars["String"]>
  genesisHash_not_in?: InputMaybe<Array<Scalars["String"]>>
  genesisHash_not_startsWith?: InputMaybe<Scalars["String"]>
  genesisHash_startsWith?: InputMaybe<Scalars["String"]>
  id_contains?: InputMaybe<Scalars["String"]>
  id_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_endsWith?: InputMaybe<Scalars["String"]>
  id_eq?: InputMaybe<Scalars["String"]>
  id_gt?: InputMaybe<Scalars["String"]>
  id_gte?: InputMaybe<Scalars["String"]>
  id_in?: InputMaybe<Array<Scalars["String"]>>
  id_isNull?: InputMaybe<Scalars["Boolean"]>
  id_lt?: InputMaybe<Scalars["String"]>
  id_lte?: InputMaybe<Scalars["String"]>
  id_not_contains?: InputMaybe<Scalars["String"]>
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_not_endsWith?: InputMaybe<Scalars["String"]>
  id_not_eq?: InputMaybe<Scalars["String"]>
  id_not_in?: InputMaybe<Array<Scalars["String"]>>
  id_not_startsWith?: InputMaybe<Scalars["String"]>
  id_startsWith?: InputMaybe<Scalars["String"]>
  implName_contains?: InputMaybe<Scalars["String"]>
  implName_containsInsensitive?: InputMaybe<Scalars["String"]>
  implName_endsWith?: InputMaybe<Scalars["String"]>
  implName_eq?: InputMaybe<Scalars["String"]>
  implName_gt?: InputMaybe<Scalars["String"]>
  implName_gte?: InputMaybe<Scalars["String"]>
  implName_in?: InputMaybe<Array<Scalars["String"]>>
  implName_isNull?: InputMaybe<Scalars["Boolean"]>
  implName_lt?: InputMaybe<Scalars["String"]>
  implName_lte?: InputMaybe<Scalars["String"]>
  implName_not_contains?: InputMaybe<Scalars["String"]>
  implName_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  implName_not_endsWith?: InputMaybe<Scalars["String"]>
  implName_not_eq?: InputMaybe<Scalars["String"]>
  implName_not_in?: InputMaybe<Array<Scalars["String"]>>
  implName_not_startsWith?: InputMaybe<Scalars["String"]>
  implName_startsWith?: InputMaybe<Scalars["String"]>
  isHealthy_eq?: InputMaybe<Scalars["Boolean"]>
  isHealthy_isNull?: InputMaybe<Scalars["Boolean"]>
  isHealthy_not_eq?: InputMaybe<Scalars["Boolean"]>
  isTestnet_eq?: InputMaybe<Scalars["Boolean"]>
  isTestnet_isNull?: InputMaybe<Scalars["Boolean"]>
  isTestnet_not_eq?: InputMaybe<Scalars["Boolean"]>
  isUnknownFeeToken_eq?: InputMaybe<Scalars["Boolean"]>
  isUnknownFeeToken_isNull?: InputMaybe<Scalars["Boolean"]>
  isUnknownFeeToken_not_eq?: InputMaybe<Scalars["Boolean"]>
  latestMetadataQrUrl_contains?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_containsInsensitive?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_endsWith?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_eq?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_gt?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_gte?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_in?: InputMaybe<Array<Scalars["String"]>>
  latestMetadataQrUrl_isNull?: InputMaybe<Scalars["Boolean"]>
  latestMetadataQrUrl_lt?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_lte?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_not_contains?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_not_endsWith?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_not_eq?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_not_in?: InputMaybe<Array<Scalars["String"]>>
  latestMetadataQrUrl_not_startsWith?: InputMaybe<Scalars["String"]>
  latestMetadataQrUrl_startsWith?: InputMaybe<Scalars["String"]>
  logo_contains?: InputMaybe<Scalars["String"]>
  logo_containsInsensitive?: InputMaybe<Scalars["String"]>
  logo_endsWith?: InputMaybe<Scalars["String"]>
  logo_eq?: InputMaybe<Scalars["String"]>
  logo_gt?: InputMaybe<Scalars["String"]>
  logo_gte?: InputMaybe<Scalars["String"]>
  logo_in?: InputMaybe<Array<Scalars["String"]>>
  logo_isNull?: InputMaybe<Scalars["Boolean"]>
  logo_lt?: InputMaybe<Scalars["String"]>
  logo_lte?: InputMaybe<Scalars["String"]>
  logo_not_contains?: InputMaybe<Scalars["String"]>
  logo_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  logo_not_endsWith?: InputMaybe<Scalars["String"]>
  logo_not_eq?: InputMaybe<Scalars["String"]>
  logo_not_in?: InputMaybe<Array<Scalars["String"]>>
  logo_not_startsWith?: InputMaybe<Scalars["String"]>
  logo_startsWith?: InputMaybe<Scalars["String"]>
  name_contains?: InputMaybe<Scalars["String"]>
  name_containsInsensitive?: InputMaybe<Scalars["String"]>
  name_endsWith?: InputMaybe<Scalars["String"]>
  name_eq?: InputMaybe<Scalars["String"]>
  name_gt?: InputMaybe<Scalars["String"]>
  name_gte?: InputMaybe<Scalars["String"]>
  name_in?: InputMaybe<Array<Scalars["String"]>>
  name_isNull?: InputMaybe<Scalars["Boolean"]>
  name_lt?: InputMaybe<Scalars["String"]>
  name_lte?: InputMaybe<Scalars["String"]>
  name_not_contains?: InputMaybe<Scalars["String"]>
  name_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  name_not_endsWith?: InputMaybe<Scalars["String"]>
  name_not_eq?: InputMaybe<Scalars["String"]>
  name_not_in?: InputMaybe<Array<Scalars["String"]>>
  name_not_startsWith?: InputMaybe<Scalars["String"]>
  name_startsWith?: InputMaybe<Scalars["String"]>
  nativeToken?: InputMaybe<TokenWhereInput>
  nativeToken_isNull?: InputMaybe<Scalars["Boolean"]>
  paraId_eq?: InputMaybe<Scalars["Int"]>
  paraId_gt?: InputMaybe<Scalars["Int"]>
  paraId_gte?: InputMaybe<Scalars["Int"]>
  paraId_in?: InputMaybe<Array<Scalars["Int"]>>
  paraId_isNull?: InputMaybe<Scalars["Boolean"]>
  paraId_lt?: InputMaybe<Scalars["Int"]>
  paraId_lte?: InputMaybe<Scalars["Int"]>
  paraId_not_eq?: InputMaybe<Scalars["Int"]>
  paraId_not_in?: InputMaybe<Array<Scalars["Int"]>>
  parathreads_every?: InputMaybe<ChainWhereInput>
  parathreads_none?: InputMaybe<ChainWhereInput>
  parathreads_some?: InputMaybe<ChainWhereInput>
  prefix_eq?: InputMaybe<Scalars["Int"]>
  prefix_gt?: InputMaybe<Scalars["Int"]>
  prefix_gte?: InputMaybe<Scalars["Int"]>
  prefix_in?: InputMaybe<Array<Scalars["Int"]>>
  prefix_isNull?: InputMaybe<Scalars["Boolean"]>
  prefix_lt?: InputMaybe<Scalars["Int"]>
  prefix_lte?: InputMaybe<Scalars["Int"]>
  prefix_not_eq?: InputMaybe<Scalars["Int"]>
  prefix_not_in?: InputMaybe<Array<Scalars["Int"]>>
  relay?: InputMaybe<ChainWhereInput>
  relay_isNull?: InputMaybe<Scalars["Boolean"]>
  rpcs_isNull?: InputMaybe<Scalars["Boolean"]>
  sortIndex_eq?: InputMaybe<Scalars["Int"]>
  sortIndex_gt?: InputMaybe<Scalars["Int"]>
  sortIndex_gte?: InputMaybe<Scalars["Int"]>
  sortIndex_in?: InputMaybe<Array<Scalars["Int"]>>
  sortIndex_isNull?: InputMaybe<Scalars["Boolean"]>
  sortIndex_lt?: InputMaybe<Scalars["Int"]>
  sortIndex_lte?: InputMaybe<Scalars["Int"]>
  sortIndex_not_eq?: InputMaybe<Scalars["Int"]>
  sortIndex_not_in?: InputMaybe<Array<Scalars["Int"]>>
  specName_contains?: InputMaybe<Scalars["String"]>
  specName_containsInsensitive?: InputMaybe<Scalars["String"]>
  specName_endsWith?: InputMaybe<Scalars["String"]>
  specName_eq?: InputMaybe<Scalars["String"]>
  specName_gt?: InputMaybe<Scalars["String"]>
  specName_gte?: InputMaybe<Scalars["String"]>
  specName_in?: InputMaybe<Array<Scalars["String"]>>
  specName_isNull?: InputMaybe<Scalars["Boolean"]>
  specName_lt?: InputMaybe<Scalars["String"]>
  specName_lte?: InputMaybe<Scalars["String"]>
  specName_not_contains?: InputMaybe<Scalars["String"]>
  specName_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  specName_not_endsWith?: InputMaybe<Scalars["String"]>
  specName_not_eq?: InputMaybe<Scalars["String"]>
  specName_not_in?: InputMaybe<Array<Scalars["String"]>>
  specName_not_startsWith?: InputMaybe<Scalars["String"]>
  specName_startsWith?: InputMaybe<Scalars["String"]>
  specVersion_contains?: InputMaybe<Scalars["String"]>
  specVersion_containsInsensitive?: InputMaybe<Scalars["String"]>
  specVersion_endsWith?: InputMaybe<Scalars["String"]>
  specVersion_eq?: InputMaybe<Scalars["String"]>
  specVersion_gt?: InputMaybe<Scalars["String"]>
  specVersion_gte?: InputMaybe<Scalars["String"]>
  specVersion_in?: InputMaybe<Array<Scalars["String"]>>
  specVersion_isNull?: InputMaybe<Scalars["Boolean"]>
  specVersion_lt?: InputMaybe<Scalars["String"]>
  specVersion_lte?: InputMaybe<Scalars["String"]>
  specVersion_not_contains?: InputMaybe<Scalars["String"]>
  specVersion_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  specVersion_not_endsWith?: InputMaybe<Scalars["String"]>
  specVersion_not_eq?: InputMaybe<Scalars["String"]>
  specVersion_not_in?: InputMaybe<Array<Scalars["String"]>>
  specVersion_not_startsWith?: InputMaybe<Scalars["String"]>
  specVersion_startsWith?: InputMaybe<Scalars["String"]>
  subscanUrl_contains?: InputMaybe<Scalars["String"]>
  subscanUrl_containsInsensitive?: InputMaybe<Scalars["String"]>
  subscanUrl_endsWith?: InputMaybe<Scalars["String"]>
  subscanUrl_eq?: InputMaybe<Scalars["String"]>
  subscanUrl_gt?: InputMaybe<Scalars["String"]>
  subscanUrl_gte?: InputMaybe<Scalars["String"]>
  subscanUrl_in?: InputMaybe<Array<Scalars["String"]>>
  subscanUrl_isNull?: InputMaybe<Scalars["Boolean"]>
  subscanUrl_lt?: InputMaybe<Scalars["String"]>
  subscanUrl_lte?: InputMaybe<Scalars["String"]>
  subscanUrl_not_contains?: InputMaybe<Scalars["String"]>
  subscanUrl_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  subscanUrl_not_endsWith?: InputMaybe<Scalars["String"]>
  subscanUrl_not_eq?: InputMaybe<Scalars["String"]>
  subscanUrl_not_in?: InputMaybe<Array<Scalars["String"]>>
  subscanUrl_not_startsWith?: InputMaybe<Scalars["String"]>
  subscanUrl_startsWith?: InputMaybe<Scalars["String"]>
  themeColor_contains?: InputMaybe<Scalars["String"]>
  themeColor_containsInsensitive?: InputMaybe<Scalars["String"]>
  themeColor_endsWith?: InputMaybe<Scalars["String"]>
  themeColor_eq?: InputMaybe<Scalars["String"]>
  themeColor_gt?: InputMaybe<Scalars["String"]>
  themeColor_gte?: InputMaybe<Scalars["String"]>
  themeColor_in?: InputMaybe<Array<Scalars["String"]>>
  themeColor_isNull?: InputMaybe<Scalars["Boolean"]>
  themeColor_lt?: InputMaybe<Scalars["String"]>
  themeColor_lte?: InputMaybe<Scalars["String"]>
  themeColor_not_contains?: InputMaybe<Scalars["String"]>
  themeColor_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  themeColor_not_endsWith?: InputMaybe<Scalars["String"]>
  themeColor_not_eq?: InputMaybe<Scalars["String"]>
  themeColor_not_in?: InputMaybe<Array<Scalars["String"]>>
  themeColor_not_startsWith?: InputMaybe<Scalars["String"]>
  themeColor_startsWith?: InputMaybe<Scalars["String"]>
  tokens_every?: InputMaybe<TokenWhereInput>
  tokens_none?: InputMaybe<TokenWhereInput>
  tokens_some?: InputMaybe<TokenWhereInput>
}

export type ChainsConnection = {
  edges: Array<ChainEdge>
  pageInfo: PageInfo
  totalCount: Scalars["Int"]
}

export type EthereumRpc = {
  /** health status of this ethereum rpc */
  isHealthy: Scalars["Boolean"]
  /** url of this ethereum rpc */
  url: Scalars["String"]
}

export type EvmNetwork = {
  /** balance metadata for this network */
  balanceMetadata: Array<BalanceModuleMetadata>
  /** balance module configs for this network */
  balanceModuleConfigs: Array<BalanceModuleConfig>
  /** block explorer url for this network */
  explorerUrl: Maybe<Scalars["String"]>
  /** the chain identifier used for signing ethereum transactions */
  id: Scalars["String"]
  /** health status of this network */
  isHealthy: Scalars["Boolean"]
  /** is this network a testnet? */
  isTestnet: Scalars["Boolean"]
  /** url of the logo for this network */
  logo: Maybe<Scalars["String"]>
  /** name for this network (talisman-defined) */
  name: Maybe<Scalars["String"]>
  /** native token for this network */
  nativeToken: Maybe<Token>
  /** ethereum rpcs for this network (talisman-defined) */
  rpcs: Array<EthereumRpc>
  /** index for sorting chains and evm networks in a user-friendly way */
  sortIndex: Maybe<Scalars["Int"]>
  /** substrate chain this evm network runs on */
  substrateChain: Maybe<Chain>
  /** a theme color for this network */
  themeColor: Maybe<Scalars["String"]>
  /** other tokens on this network */
  tokens: Array<Token>
}

export type EvmNetworkTokensArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<TokenOrderByInput>>
  where?: InputMaybe<TokenWhereInput>
}

export type EvmNetworkEdge = {
  cursor: Scalars["String"]
  node: EvmNetwork
}

export type EvmNetworkOrderByInput =
  | "explorerUrl_ASC"
  | "explorerUrl_DESC"
  | "id_ASC"
  | "id_DESC"
  | "isHealthy_ASC"
  | "isHealthy_DESC"
  | "isTestnet_ASC"
  | "isTestnet_DESC"
  | "logo_ASC"
  | "logo_DESC"
  | "name_ASC"
  | "name_DESC"
  | "nativeToken_id_ASC"
  | "nativeToken_id_DESC"
  | "sortIndex_ASC"
  | "sortIndex_DESC"
  | "substrateChain_account_ASC"
  | "substrateChain_account_DESC"
  | "substrateChain_chainName_ASC"
  | "substrateChain_chainName_DESC"
  | "substrateChain_chainspecQrUrl_ASC"
  | "substrateChain_chainspecQrUrl_DESC"
  | "substrateChain_genesisHash_ASC"
  | "substrateChain_genesisHash_DESC"
  | "substrateChain_id_ASC"
  | "substrateChain_id_DESC"
  | "substrateChain_implName_ASC"
  | "substrateChain_implName_DESC"
  | "substrateChain_isHealthy_ASC"
  | "substrateChain_isHealthy_DESC"
  | "substrateChain_isTestnet_ASC"
  | "substrateChain_isTestnet_DESC"
  | "substrateChain_isUnknownFeeToken_ASC"
  | "substrateChain_isUnknownFeeToken_DESC"
  | "substrateChain_latestMetadataQrUrl_ASC"
  | "substrateChain_latestMetadataQrUrl_DESC"
  | "substrateChain_logo_ASC"
  | "substrateChain_logo_DESC"
  | "substrateChain_name_ASC"
  | "substrateChain_name_DESC"
  | "substrateChain_paraId_ASC"
  | "substrateChain_paraId_DESC"
  | "substrateChain_prefix_ASC"
  | "substrateChain_prefix_DESC"
  | "substrateChain_sortIndex_ASC"
  | "substrateChain_sortIndex_DESC"
  | "substrateChain_specName_ASC"
  | "substrateChain_specName_DESC"
  | "substrateChain_specVersion_ASC"
  | "substrateChain_specVersion_DESC"
  | "substrateChain_subscanUrl_ASC"
  | "substrateChain_subscanUrl_DESC"
  | "substrateChain_themeColor_ASC"
  | "substrateChain_themeColor_DESC"
  | "themeColor_ASC"
  | "themeColor_DESC"

export type EvmNetworkWhereInput = {
  AND?: InputMaybe<Array<EvmNetworkWhereInput>>
  OR?: InputMaybe<Array<EvmNetworkWhereInput>>
  balanceMetadata_isNull?: InputMaybe<Scalars["Boolean"]>
  balanceModuleConfigs_isNull?: InputMaybe<Scalars["Boolean"]>
  explorerUrl_contains?: InputMaybe<Scalars["String"]>
  explorerUrl_containsInsensitive?: InputMaybe<Scalars["String"]>
  explorerUrl_endsWith?: InputMaybe<Scalars["String"]>
  explorerUrl_eq?: InputMaybe<Scalars["String"]>
  explorerUrl_gt?: InputMaybe<Scalars["String"]>
  explorerUrl_gte?: InputMaybe<Scalars["String"]>
  explorerUrl_in?: InputMaybe<Array<Scalars["String"]>>
  explorerUrl_isNull?: InputMaybe<Scalars["Boolean"]>
  explorerUrl_lt?: InputMaybe<Scalars["String"]>
  explorerUrl_lte?: InputMaybe<Scalars["String"]>
  explorerUrl_not_contains?: InputMaybe<Scalars["String"]>
  explorerUrl_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  explorerUrl_not_endsWith?: InputMaybe<Scalars["String"]>
  explorerUrl_not_eq?: InputMaybe<Scalars["String"]>
  explorerUrl_not_in?: InputMaybe<Array<Scalars["String"]>>
  explorerUrl_not_startsWith?: InputMaybe<Scalars["String"]>
  explorerUrl_startsWith?: InputMaybe<Scalars["String"]>
  id_contains?: InputMaybe<Scalars["String"]>
  id_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_endsWith?: InputMaybe<Scalars["String"]>
  id_eq?: InputMaybe<Scalars["String"]>
  id_gt?: InputMaybe<Scalars["String"]>
  id_gte?: InputMaybe<Scalars["String"]>
  id_in?: InputMaybe<Array<Scalars["String"]>>
  id_isNull?: InputMaybe<Scalars["Boolean"]>
  id_lt?: InputMaybe<Scalars["String"]>
  id_lte?: InputMaybe<Scalars["String"]>
  id_not_contains?: InputMaybe<Scalars["String"]>
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_not_endsWith?: InputMaybe<Scalars["String"]>
  id_not_eq?: InputMaybe<Scalars["String"]>
  id_not_in?: InputMaybe<Array<Scalars["String"]>>
  id_not_startsWith?: InputMaybe<Scalars["String"]>
  id_startsWith?: InputMaybe<Scalars["String"]>
  isHealthy_eq?: InputMaybe<Scalars["Boolean"]>
  isHealthy_isNull?: InputMaybe<Scalars["Boolean"]>
  isHealthy_not_eq?: InputMaybe<Scalars["Boolean"]>
  isTestnet_eq?: InputMaybe<Scalars["Boolean"]>
  isTestnet_isNull?: InputMaybe<Scalars["Boolean"]>
  isTestnet_not_eq?: InputMaybe<Scalars["Boolean"]>
  logo_contains?: InputMaybe<Scalars["String"]>
  logo_containsInsensitive?: InputMaybe<Scalars["String"]>
  logo_endsWith?: InputMaybe<Scalars["String"]>
  logo_eq?: InputMaybe<Scalars["String"]>
  logo_gt?: InputMaybe<Scalars["String"]>
  logo_gte?: InputMaybe<Scalars["String"]>
  logo_in?: InputMaybe<Array<Scalars["String"]>>
  logo_isNull?: InputMaybe<Scalars["Boolean"]>
  logo_lt?: InputMaybe<Scalars["String"]>
  logo_lte?: InputMaybe<Scalars["String"]>
  logo_not_contains?: InputMaybe<Scalars["String"]>
  logo_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  logo_not_endsWith?: InputMaybe<Scalars["String"]>
  logo_not_eq?: InputMaybe<Scalars["String"]>
  logo_not_in?: InputMaybe<Array<Scalars["String"]>>
  logo_not_startsWith?: InputMaybe<Scalars["String"]>
  logo_startsWith?: InputMaybe<Scalars["String"]>
  name_contains?: InputMaybe<Scalars["String"]>
  name_containsInsensitive?: InputMaybe<Scalars["String"]>
  name_endsWith?: InputMaybe<Scalars["String"]>
  name_eq?: InputMaybe<Scalars["String"]>
  name_gt?: InputMaybe<Scalars["String"]>
  name_gte?: InputMaybe<Scalars["String"]>
  name_in?: InputMaybe<Array<Scalars["String"]>>
  name_isNull?: InputMaybe<Scalars["Boolean"]>
  name_lt?: InputMaybe<Scalars["String"]>
  name_lte?: InputMaybe<Scalars["String"]>
  name_not_contains?: InputMaybe<Scalars["String"]>
  name_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  name_not_endsWith?: InputMaybe<Scalars["String"]>
  name_not_eq?: InputMaybe<Scalars["String"]>
  name_not_in?: InputMaybe<Array<Scalars["String"]>>
  name_not_startsWith?: InputMaybe<Scalars["String"]>
  name_startsWith?: InputMaybe<Scalars["String"]>
  nativeToken?: InputMaybe<TokenWhereInput>
  nativeToken_isNull?: InputMaybe<Scalars["Boolean"]>
  rpcs_isNull?: InputMaybe<Scalars["Boolean"]>
  sortIndex_eq?: InputMaybe<Scalars["Int"]>
  sortIndex_gt?: InputMaybe<Scalars["Int"]>
  sortIndex_gte?: InputMaybe<Scalars["Int"]>
  sortIndex_in?: InputMaybe<Array<Scalars["Int"]>>
  sortIndex_isNull?: InputMaybe<Scalars["Boolean"]>
  sortIndex_lt?: InputMaybe<Scalars["Int"]>
  sortIndex_lte?: InputMaybe<Scalars["Int"]>
  sortIndex_not_eq?: InputMaybe<Scalars["Int"]>
  sortIndex_not_in?: InputMaybe<Array<Scalars["Int"]>>
  substrateChain?: InputMaybe<ChainWhereInput>
  substrateChain_isNull?: InputMaybe<Scalars["Boolean"]>
  themeColor_contains?: InputMaybe<Scalars["String"]>
  themeColor_containsInsensitive?: InputMaybe<Scalars["String"]>
  themeColor_endsWith?: InputMaybe<Scalars["String"]>
  themeColor_eq?: InputMaybe<Scalars["String"]>
  themeColor_gt?: InputMaybe<Scalars["String"]>
  themeColor_gte?: InputMaybe<Scalars["String"]>
  themeColor_in?: InputMaybe<Array<Scalars["String"]>>
  themeColor_isNull?: InputMaybe<Scalars["Boolean"]>
  themeColor_lt?: InputMaybe<Scalars["String"]>
  themeColor_lte?: InputMaybe<Scalars["String"]>
  themeColor_not_contains?: InputMaybe<Scalars["String"]>
  themeColor_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  themeColor_not_endsWith?: InputMaybe<Scalars["String"]>
  themeColor_not_eq?: InputMaybe<Scalars["String"]>
  themeColor_not_in?: InputMaybe<Array<Scalars["String"]>>
  themeColor_not_startsWith?: InputMaybe<Scalars["String"]>
  themeColor_startsWith?: InputMaybe<Scalars["String"]>
  tokens_every?: InputMaybe<TokenWhereInput>
  tokens_none?: InputMaybe<TokenWhereInput>
  tokens_some?: InputMaybe<TokenWhereInput>
}

export type EvmNetworksConnection = {
  edges: Array<EvmNetworkEdge>
  pageInfo: PageInfo
  totalCount: Scalars["Int"]
}

export type PageInfo = {
  endCursor: Scalars["String"]
  hasNextPage: Scalars["Boolean"]
  hasPreviousPage: Scalars["Boolean"]
  startCursor: Scalars["String"]
}

export type Query = {
  cachedCoingeckoLogoById: Maybe<CachedCoingeckoLogo>
  /** @deprecated Use cachedCoingeckoLogoById */
  cachedCoingeckoLogoByUniqueInput: Maybe<CachedCoingeckoLogo>
  cachedCoingeckoLogos: Array<CachedCoingeckoLogo>
  cachedCoingeckoLogosConnection: CachedCoingeckoLogosConnection
  chainById: Maybe<Chain>
  /** @deprecated Use chainById */
  chainByUniqueInput: Maybe<Chain>
  chains: Array<Chain>
  chainsConnection: ChainsConnection
  evmNetworkById: Maybe<EvmNetwork>
  /** @deprecated Use evmNetworkById */
  evmNetworkByUniqueInput: Maybe<EvmNetwork>
  evmNetworks: Array<EvmNetwork>
  evmNetworksConnection: EvmNetworksConnection
  squidStatus: Maybe<SquidStatus>
  tokenById: Maybe<Token>
  /** @deprecated Use tokenById */
  tokenByUniqueInput: Maybe<Token>
  tokens: Array<Token>
  tokensConnection: TokensConnection
}

export type QueryCachedCoingeckoLogoByIdArgs = {
  id: Scalars["String"]
}

export type QueryCachedCoingeckoLogoByUniqueInputArgs = {
  where: WhereIdInput
}

export type QueryCachedCoingeckoLogosArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<CachedCoingeckoLogoOrderByInput>>
  where?: InputMaybe<CachedCoingeckoLogoWhereInput>
}

export type QueryCachedCoingeckoLogosConnectionArgs = {
  after?: InputMaybe<Scalars["String"]>
  first?: InputMaybe<Scalars["Int"]>
  orderBy: Array<CachedCoingeckoLogoOrderByInput>
  where?: InputMaybe<CachedCoingeckoLogoWhereInput>
}

export type QueryChainByIdArgs = {
  id: Scalars["String"]
}

export type QueryChainByUniqueInputArgs = {
  where: WhereIdInput
}

export type QueryChainsArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<ChainOrderByInput>>
  where?: InputMaybe<ChainWhereInput>
}

export type QueryChainsConnectionArgs = {
  after?: InputMaybe<Scalars["String"]>
  first?: InputMaybe<Scalars["Int"]>
  orderBy: Array<ChainOrderByInput>
  where?: InputMaybe<ChainWhereInput>
}

export type QueryEvmNetworkByIdArgs = {
  id: Scalars["String"]
}

export type QueryEvmNetworkByUniqueInputArgs = {
  where: WhereIdInput
}

export type QueryEvmNetworksArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<EvmNetworkOrderByInput>>
  where?: InputMaybe<EvmNetworkWhereInput>
}

export type QueryEvmNetworksConnectionArgs = {
  after?: InputMaybe<Scalars["String"]>
  first?: InputMaybe<Scalars["Int"]>
  orderBy: Array<EvmNetworkOrderByInput>
  where?: InputMaybe<EvmNetworkWhereInput>
}

export type QueryTokenByIdArgs = {
  id: Scalars["String"]
}

export type QueryTokenByUniqueInputArgs = {
  where: WhereIdInput
}

export type QueryTokensArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<TokenOrderByInput>>
  where?: InputMaybe<TokenWhereInput>
}

export type QueryTokensConnectionArgs = {
  after?: InputMaybe<Scalars["String"]>
  first?: InputMaybe<Scalars["Int"]>
  orderBy: Array<TokenOrderByInput>
  where?: InputMaybe<TokenWhereInput>
}

export type SquidStatus = {
  /** The height of the processed part of the chain */
  height: Maybe<Scalars["Int"]>
}

export type SubstrateRpc = {
  /** health status of this substrate rpc */
  isHealthy: Scalars["Boolean"]
  /** url of this substrate rpc */
  url: Scalars["String"]
}

export type Token = {
  /** TODO: Put all token data into here (because we have plugins now) */
  data: Maybe<Scalars["JSON"]>
  /** id for this token (talisman-defined) */
  id: Scalars["String"]
  /** implementation detail for relation lookups, can be removed once https://github.com/subsquid/squid/issues/41 is merged */
  squidImplementationDetailChain: Maybe<Chain>
  /** implementation detail for relation lookups, can be removed once https://github.com/subsquid/squid/issues/41 is merged */
  squidImplementationDetailEvmNetwork: Maybe<EvmNetwork>
  /** implementation detail for relation lookups, can be removed once https://github.com/subsquid/squid/issues/41 is merged */
  squidImplementationDetailNativeToChains: Array<Chain>
  /** implementation detail for relation lookups, can be removed once https://github.com/subsquid/squid/issues/41 is merged */
  squidImplementationDetailNativeToEvmNetworks: Array<EvmNetwork>
}

export type TokenSquidImplementationDetailNativeToChainsArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<ChainOrderByInput>>
  where?: InputMaybe<ChainWhereInput>
}

export type TokenSquidImplementationDetailNativeToEvmNetworksArgs = {
  limit?: InputMaybe<Scalars["Int"]>
  offset?: InputMaybe<Scalars["Int"]>
  orderBy?: InputMaybe<Array<EvmNetworkOrderByInput>>
  where?: InputMaybe<EvmNetworkWhereInput>
}

export type TokenEdge = {
  cursor: Scalars["String"]
  node: Token
}

export type TokenOrderByInput =
  | "id_ASC"
  | "id_DESC"
  | "squidImplementationDetailChain_account_ASC"
  | "squidImplementationDetailChain_account_DESC"
  | "squidImplementationDetailChain_chainName_ASC"
  | "squidImplementationDetailChain_chainName_DESC"
  | "squidImplementationDetailChain_chainspecQrUrl_ASC"
  | "squidImplementationDetailChain_chainspecQrUrl_DESC"
  | "squidImplementationDetailChain_genesisHash_ASC"
  | "squidImplementationDetailChain_genesisHash_DESC"
  | "squidImplementationDetailChain_id_ASC"
  | "squidImplementationDetailChain_id_DESC"
  | "squidImplementationDetailChain_implName_ASC"
  | "squidImplementationDetailChain_implName_DESC"
  | "squidImplementationDetailChain_isHealthy_ASC"
  | "squidImplementationDetailChain_isHealthy_DESC"
  | "squidImplementationDetailChain_isTestnet_ASC"
  | "squidImplementationDetailChain_isTestnet_DESC"
  | "squidImplementationDetailChain_isUnknownFeeToken_ASC"
  | "squidImplementationDetailChain_isUnknownFeeToken_DESC"
  | "squidImplementationDetailChain_latestMetadataQrUrl_ASC"
  | "squidImplementationDetailChain_latestMetadataQrUrl_DESC"
  | "squidImplementationDetailChain_logo_ASC"
  | "squidImplementationDetailChain_logo_DESC"
  | "squidImplementationDetailChain_name_ASC"
  | "squidImplementationDetailChain_name_DESC"
  | "squidImplementationDetailChain_paraId_ASC"
  | "squidImplementationDetailChain_paraId_DESC"
  | "squidImplementationDetailChain_prefix_ASC"
  | "squidImplementationDetailChain_prefix_DESC"
  | "squidImplementationDetailChain_sortIndex_ASC"
  | "squidImplementationDetailChain_sortIndex_DESC"
  | "squidImplementationDetailChain_specName_ASC"
  | "squidImplementationDetailChain_specName_DESC"
  | "squidImplementationDetailChain_specVersion_ASC"
  | "squidImplementationDetailChain_specVersion_DESC"
  | "squidImplementationDetailChain_subscanUrl_ASC"
  | "squidImplementationDetailChain_subscanUrl_DESC"
  | "squidImplementationDetailChain_themeColor_ASC"
  | "squidImplementationDetailChain_themeColor_DESC"
  | "squidImplementationDetailEvmNetwork_explorerUrl_ASC"
  | "squidImplementationDetailEvmNetwork_explorerUrl_DESC"
  | "squidImplementationDetailEvmNetwork_id_ASC"
  | "squidImplementationDetailEvmNetwork_id_DESC"
  | "squidImplementationDetailEvmNetwork_isHealthy_ASC"
  | "squidImplementationDetailEvmNetwork_isHealthy_DESC"
  | "squidImplementationDetailEvmNetwork_isTestnet_ASC"
  | "squidImplementationDetailEvmNetwork_isTestnet_DESC"
  | "squidImplementationDetailEvmNetwork_logo_ASC"
  | "squidImplementationDetailEvmNetwork_logo_DESC"
  | "squidImplementationDetailEvmNetwork_name_ASC"
  | "squidImplementationDetailEvmNetwork_name_DESC"
  | "squidImplementationDetailEvmNetwork_sortIndex_ASC"
  | "squidImplementationDetailEvmNetwork_sortIndex_DESC"
  | "squidImplementationDetailEvmNetwork_themeColor_ASC"
  | "squidImplementationDetailEvmNetwork_themeColor_DESC"

export type TokenWhereInput = {
  AND?: InputMaybe<Array<TokenWhereInput>>
  OR?: InputMaybe<Array<TokenWhereInput>>
  data_eq?: InputMaybe<Scalars["JSON"]>
  data_isNull?: InputMaybe<Scalars["Boolean"]>
  data_jsonContains?: InputMaybe<Scalars["JSON"]>
  data_jsonHasKey?: InputMaybe<Scalars["JSON"]>
  data_not_eq?: InputMaybe<Scalars["JSON"]>
  id_contains?: InputMaybe<Scalars["String"]>
  id_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_endsWith?: InputMaybe<Scalars["String"]>
  id_eq?: InputMaybe<Scalars["String"]>
  id_gt?: InputMaybe<Scalars["String"]>
  id_gte?: InputMaybe<Scalars["String"]>
  id_in?: InputMaybe<Array<Scalars["String"]>>
  id_isNull?: InputMaybe<Scalars["Boolean"]>
  id_lt?: InputMaybe<Scalars["String"]>
  id_lte?: InputMaybe<Scalars["String"]>
  id_not_contains?: InputMaybe<Scalars["String"]>
  id_not_containsInsensitive?: InputMaybe<Scalars["String"]>
  id_not_endsWith?: InputMaybe<Scalars["String"]>
  id_not_eq?: InputMaybe<Scalars["String"]>
  id_not_in?: InputMaybe<Array<Scalars["String"]>>
  id_not_startsWith?: InputMaybe<Scalars["String"]>
  id_startsWith?: InputMaybe<Scalars["String"]>
  squidImplementationDetailChain?: InputMaybe<ChainWhereInput>
  squidImplementationDetailChain_isNull?: InputMaybe<Scalars["Boolean"]>
  squidImplementationDetailEvmNetwork?: InputMaybe<EvmNetworkWhereInput>
  squidImplementationDetailEvmNetwork_isNull?: InputMaybe<Scalars["Boolean"]>
  squidImplementationDetailNativeToChains_every?: InputMaybe<ChainWhereInput>
  squidImplementationDetailNativeToChains_none?: InputMaybe<ChainWhereInput>
  squidImplementationDetailNativeToChains_some?: InputMaybe<ChainWhereInput>
  squidImplementationDetailNativeToEvmNetworks_every?: InputMaybe<EvmNetworkWhereInput>
  squidImplementationDetailNativeToEvmNetworks_none?: InputMaybe<EvmNetworkWhereInput>
  squidImplementationDetailNativeToEvmNetworks_some?: InputMaybe<EvmNetworkWhereInput>
}

export type TokensConnection = {
  edges: Array<TokenEdge>
  pageInfo: PageInfo
  totalCount: Scalars["Int"]
}

export type WhereIdInput = {
  id: Scalars["String"]
}

export type ChainFragment = {
  id: string
  isTestnet: boolean
  sortIndex: number | null
  genesisHash: string | null
  prefix: number | null
  name: string | null
  themeColor: string | null
  logo: string | null
  chainName: string | null
  implName: string | null
  specName: string | null
  specVersion: string | null
  account: string | null
  subscanUrl: string | null
  chainspecQrUrl: string | null
  latestMetadataQrUrl: string | null
  isUnknownFeeToken: boolean
  isHealthy: boolean
  paraId: number | null
  nativeToken: { id: string } | null
  tokens: Array<{ id: string }>
  rpcs: Array<{ url: string; isHealthy: boolean }>
  evmNetworks: Array<{ id: string }>
  parathreads: Array<{ id: string; paraId: number | null; name: string | null }>
  relay: { id: string } | null
  balanceMetadata: Array<{ moduleType: string; metadata: unknown }>
}

export type EvmNetworkFragment = {
  id: string
  isTestnet: boolean
  sortIndex: number | null
  name: string | null
  themeColor: string | null
  logo: string | null
  explorerUrl: string | null
  isHealthy: boolean
  nativeToken: { id: string } | null
  tokens: Array<{ id: string }>
  rpcs: Array<{ url: string; isHealthy: boolean }>
  substrateChain: { id: string } | null
}

export type TokenFragment = {
  id: string
  data: unknown | null
  squidImplementationDetailNativeToChains: Array<{ id: string }>
  squidImplementationDetailNativeToEvmNetworks: Array<{ id: string }>
}

export type ChainsQueryVariables = Exact<{ [key: string]: never }>

export type ChainsQuery = {
  chains: Array<{
    id: string
    isTestnet: boolean
    sortIndex: number | null
    genesisHash: `0x${string}` | null
    prefix: number | null
    name: string | null
    themeColor: string | null
    logo: string | null
    chainName: string | null
    implName: string | null
    specName: string | null
    specVersion: string | null
    account: string | null
    subscanUrl: string | null
    chainspecQrUrl: string | null
    latestMetadataQrUrl: string | null
    isUnknownFeeToken: boolean
    isHealthy: boolean
    paraId: number | null
    nativeToken: { id: string } | null
    tokens: Array<{ id: string }>
    rpcs: Array<{ url: string; isHealthy: boolean }>
    evmNetworks: Array<{ id: string }>
    parathreads: Array<{ id: string; paraId: number | null; name: string | null }>
    relay: { id: string } | null
    balanceMetadata: Array<{ moduleType: string; metadata: unknown }>
  }>
}

export type ChainByIdQueryVariables = Exact<{
  chainId: Scalars["String"]
}>

export type ChainByIdQuery = {
  chainById: {
    id: string
    isTestnet: boolean
    sortIndex: number | null
    genesisHash: string | null
    prefix: number | null
    name: string | null
    themeColor: string | null
    logo: string | null
    chainName: string | null
    implName: string | null
    specName: string | null
    specVersion: string | null
    account: string | null
    subscanUrl: string | null
    chainspecQrUrl: string | null
    latestMetadataQrUrl: string | null
    isUnknownFeeToken: boolean
    isHealthy: boolean
    paraId: number | null
    nativeToken: { id: string } | null
    tokens: Array<{ id: string }>
    rpcs: Array<{ url: string; isHealthy: boolean }>
    evmNetworks: Array<{ id: string }>
    parathreads: Array<{ id: string; paraId: number | null; name: string | null }>
    relay: { id: string } | null
    balanceMetadata: Array<{ moduleType: string; metadata: unknown }>
  } | null
}

export type EvmNetworksQueryVariables = Exact<{ [key: string]: never }>

export type EvmNetworksQuery = {
  evmNetworks: Array<{
    id: string
    isTestnet: boolean
    sortIndex: number | null
    name: string | null
    themeColor: string | null
    logo: string | null
    explorerUrl: string | null
    isHealthy: boolean
    nativeToken: { id: string } | null
    tokens: Array<{ id: string }>
    rpcs: Array<{ url: string; isHealthy: boolean }>
    substrateChain: { id: string } | null
  }>
}

export type EvmNetworkByIdQueryVariables = Exact<{
  evmNetworkId: Scalars["String"]
}>

export type EvmNetworkByIdQuery = {
  evmNetworkById: {
    id: string
    isTestnet: boolean
    sortIndex: number | null
    name: string | null
    themeColor: string | null
    logo: string | null
    explorerUrl: string | null
    isHealthy: boolean
    nativeToken: { id: string } | null
    tokens: Array<{ id: string }>
    rpcs: Array<{ url: string; isHealthy: boolean }>
    substrateChain: { id: string } | null
  } | null
}

export type TokensQueryVariables = Exact<{ [key: string]: never }>

export type TokensQuery = {
  tokens: Array<{
    id: string
    data: unknown | null
    squidImplementationDetailNativeToChains: Array<{ id: string }>
    squidImplementationDetailNativeToEvmNetworks: Array<{ id: string }>
  }>
}

export type TokenByIdQueryVariables = Exact<{
  tokenId: Scalars["String"]
}>

export type TokenByIdQuery = {
  tokenById: {
    id: string
    data: unknown | null
    squidImplementationDetailNativeToChains: Array<{ id: string }>
    squidImplementationDetailNativeToEvmNetworks: Array<{ id: string }>
  } | null
}

export const ChainFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Chain" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Chain" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "genesisHash" } },
          { kind: "Field", name: { kind: "Name", value: "prefix" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          { kind: "Field", name: { kind: "Name", value: "chainName" } },
          { kind: "Field", name: { kind: "Name", value: "implName" } },
          { kind: "Field", name: { kind: "Name", value: "specName" } },
          { kind: "Field", name: { kind: "Name", value: "specVersion" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "account" } },
          { kind: "Field", name: { kind: "Name", value: "subscanUrl" } },
          { kind: "Field", name: { kind: "Name", value: "chainspecQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "latestMetadataQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "isUnknownFeeToken" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "evmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "parathreads" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "paraId_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "paraId" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "paraId" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "relay" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "balanceMetadata" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "moduleType" } },
                { kind: "Field", name: { kind: "Name", value: "metadata" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChainFragment, unknown>
export const EvmNetworkFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "EvmNetwork" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "EvmNetwork" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "explorerUrl" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "substrateChain" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvmNetworkFragment, unknown>
export const TokenFragmentDoc = {
  kind: "Document",
  definitions: [
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Token" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Token" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "data" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToChains" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "sortIndex_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToEvmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TokenFragment, unknown>
export const ChainsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "chains" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "chains" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "sortIndex_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "Chain" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Chain" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Chain" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "genesisHash" } },
          { kind: "Field", name: { kind: "Name", value: "prefix" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          { kind: "Field", name: { kind: "Name", value: "chainName" } },
          { kind: "Field", name: { kind: "Name", value: "implName" } },
          { kind: "Field", name: { kind: "Name", value: "specName" } },
          { kind: "Field", name: { kind: "Name", value: "specVersion" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "account" } },
          { kind: "Field", name: { kind: "Name", value: "subscanUrl" } },
          { kind: "Field", name: { kind: "Name", value: "chainspecQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "latestMetadataQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "isUnknownFeeToken" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "evmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "parathreads" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "paraId_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "paraId" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "paraId" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "relay" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "balanceMetadata" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "moduleType" } },
                { kind: "Field", name: { kind: "Name", value: "metadata" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChainsQuery, ChainsQueryVariables>
export const ChainByIdDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "chainById" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "chainId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "chainById" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "chainId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "Chain" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Chain" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Chain" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "genesisHash" } },
          { kind: "Field", name: { kind: "Name", value: "prefix" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          { kind: "Field", name: { kind: "Name", value: "chainName" } },
          { kind: "Field", name: { kind: "Name", value: "implName" } },
          { kind: "Field", name: { kind: "Name", value: "specName" } },
          { kind: "Field", name: { kind: "Name", value: "specVersion" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "account" } },
          { kind: "Field", name: { kind: "Name", value: "subscanUrl" } },
          { kind: "Field", name: { kind: "Name", value: "chainspecQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "latestMetadataQrUrl" } },
          { kind: "Field", name: { kind: "Name", value: "isUnknownFeeToken" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "evmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "parathreads" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "paraId_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "paraId" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "paraId" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "relay" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "balanceMetadata" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "moduleType" } },
                { kind: "Field", name: { kind: "Name", value: "metadata" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<ChainByIdQuery, ChainByIdQueryVariables>
export const EvmNetworksDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "evmNetworks" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "evmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "sortIndex_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "EvmNetwork" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "EvmNetwork" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "EvmNetwork" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "explorerUrl" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "substrateChain" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvmNetworksQuery, EvmNetworksQueryVariables>
export const EvmNetworkByIdDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "evmNetworkById" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "evmNetworkId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "evmNetworkById" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "evmNetworkId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "EvmNetwork" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "EvmNetwork" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "EvmNetwork" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "isTestnet" } },
          { kind: "Field", name: { kind: "Name", value: "sortIndex" } },
          { kind: "Field", name: { kind: "Name", value: "name" } },
          { kind: "Field", name: { kind: "Name", value: "themeColor" } },
          { kind: "Field", name: { kind: "Name", value: "logo" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "nativeToken" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "explorerUrl" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "rpcs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
              ],
            },
          },
          { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "substrateChain" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<EvmNetworkByIdQuery, EvmNetworkByIdQueryVariables>
export const TokensDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "tokens" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "tokens" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "id_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "Token" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Token" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Token" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "data" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToChains" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "sortIndex_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToEvmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TokensQuery, TokensQueryVariables>
export const TokenByIdDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "tokenById" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "tokenId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "tokenById" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "tokenId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "FragmentSpread", name: { kind: "Name", value: "Token" } }],
            },
          },
        ],
      },
    },
    {
      kind: "FragmentDefinition",
      name: { kind: "Name", value: "Token" },
      typeCondition: { kind: "NamedType", name: { kind: "Name", value: "Token" } },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          { kind: "Field", name: { kind: "Name", value: "id" } },
          { kind: "Field", name: { kind: "Name", value: "data" } },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToChains" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "sortIndex_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
          {
            kind: "Field",
            name: { kind: "Name", value: "squidImplementationDetailNativeToEvmNetworks" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "orderBy" },
                value: { kind: "EnumValue", value: "name_ASC" },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<TokenByIdQuery, TokenByIdQueryVariables>
