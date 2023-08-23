import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core"

/* eslint-disable */
import * as types from "./graphql"

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
  "\n  fragment Chain on Chain {\n    id\n    isTestnet\n    sortIndex\n    genesisHash\n    prefix\n    name\n    themeColor\n    logo\n    chainName\n    implName\n    specName\n    specVersion\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    account\n    subscanUrl\n    chainspecQrUrl\n    latestMetadataQrUrl\n    isUnknownFeeToken\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    evmNetworks(orderBy: name_ASC) {\n      id\n    }\n    parathreads(orderBy: paraId_ASC) {\n      id\n      paraId\n      name\n    }\n    paraId\n    relay {\n      id\n    }\n    balanceMetadata {\n      moduleType\n      metadata\n    }\n  }\n":
    types.ChainFragmentDoc,
  "\n  fragment EvmNetwork on EvmNetwork {\n    id\n    isTestnet\n    sortIndex\n    name\n    themeColor\n    logo\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    explorerUrl\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    substrateChain {\n      id\n    }\n  }\n":
    types.EvmNetworkFragmentDoc,
  "\n  fragment Token on Token {\n    id\n    data\n\n    # TODO: Fix (add variants and their relations) when https://github.com/subsquid/squid/issues/41 is merged\n\n    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {\n      id\n    }\n    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {\n      id\n    }\n  }\n":
    types.TokenFragmentDoc,
  "\n  query chains {\n    chains(orderBy: sortIndex_ASC) {\n      ...Chain\n    }\n  }\n":
    types.ChainsDocument,
  "\n  query chainById($chainId: String!) {\n    chainById(id: $chainId) {\n      ...Chain\n    }\n  }\n":
    types.ChainByIdDocument,
  "\n  query evmNetworks {\n    evmNetworks(orderBy: sortIndex_ASC) {\n      ...EvmNetwork\n    }\n  }\n":
    types.EvmNetworksDocument,
  "\n  query evmNetworkById($evmNetworkId: String!) {\n    evmNetworkById(id: $evmNetworkId) {\n      ...EvmNetwork\n    }\n  }\n":
    types.EvmNetworkByIdDocument,
  "\n  query tokens {\n    tokens(orderBy: id_ASC) {\n      ...Token\n    }\n  }\n":
    types.TokensDocument,
  "\n  query tokenById($tokenId: String!) {\n    tokenById(id: $tokenId) {\n      ...Token\n    }\n  }\n":
    types.TokenByIdDocument,
}

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment Chain on Chain {\n    id\n    isTestnet\n    sortIndex\n    genesisHash\n    prefix\n    name\n    themeColor\n    logo\n    chainName\n    implName\n    specName\n    specVersion\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    account\n    subscanUrl\n    chainspecQrUrl\n    latestMetadataQrUrl\n    isUnknownFeeToken\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    evmNetworks(orderBy: name_ASC) {\n      id\n    }\n    parathreads(orderBy: paraId_ASC) {\n      id\n      paraId\n      name\n    }\n    paraId\n    relay {\n      id\n    }\n    balanceMetadata {\n      moduleType\n      metadata\n    }\n  }\n"
): (typeof documents)["\n  fragment Chain on Chain {\n    id\n    isTestnet\n    sortIndex\n    genesisHash\n    prefix\n    name\n    themeColor\n    logo\n    chainName\n    implName\n    specName\n    specVersion\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    account\n    subscanUrl\n    chainspecQrUrl\n    latestMetadataQrUrl\n    isUnknownFeeToken\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    evmNetworks(orderBy: name_ASC) {\n      id\n    }\n    parathreads(orderBy: paraId_ASC) {\n      id\n      paraId\n      name\n    }\n    paraId\n    relay {\n      id\n    }\n    balanceMetadata {\n      moduleType\n      metadata\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment EvmNetwork on EvmNetwork {\n    id\n    isTestnet\n    sortIndex\n    name\n    themeColor\n    logo\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    explorerUrl\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    substrateChain {\n      id\n    }\n  }\n"
): (typeof documents)["\n  fragment EvmNetwork on EvmNetwork {\n    id\n    isTestnet\n    sortIndex\n    name\n    themeColor\n    logo\n    nativeToken {\n      id\n    }\n    tokens(orderBy: id_ASC) {\n      id\n    }\n    explorerUrl\n    rpcs {\n      url\n      isHealthy\n    }\n    isHealthy\n    substrateChain {\n      id\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  fragment Token on Token {\n    id\n    data\n\n    # TODO: Fix (add variants and their relations) when https://github.com/subsquid/squid/issues/41 is merged\n\n    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {\n      id\n    }\n    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {\n      id\n    }\n  }\n"
): (typeof documents)["\n  fragment Token on Token {\n    id\n    data\n\n    # TODO: Fix (add variants and their relations) when https://github.com/subsquid/squid/issues/41 is merged\n\n    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {\n      id\n    }\n    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {\n      id\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query chains {\n    chains(orderBy: sortIndex_ASC) {\n      ...Chain\n    }\n  }\n"
): (typeof documents)["\n  query chains {\n    chains(orderBy: sortIndex_ASC) {\n      ...Chain\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query chainById($chainId: String!) {\n    chainById(id: $chainId) {\n      ...Chain\n    }\n  }\n"
): (typeof documents)["\n  query chainById($chainId: String!) {\n    chainById(id: $chainId) {\n      ...Chain\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query evmNetworks {\n    evmNetworks(orderBy: sortIndex_ASC) {\n      ...EvmNetwork\n    }\n  }\n"
): (typeof documents)["\n  query evmNetworks {\n    evmNetworks(orderBy: sortIndex_ASC) {\n      ...EvmNetwork\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query evmNetworkById($evmNetworkId: String!) {\n    evmNetworkById(id: $evmNetworkId) {\n      ...EvmNetwork\n    }\n  }\n"
): (typeof documents)["\n  query evmNetworkById($evmNetworkId: String!) {\n    evmNetworkById(id: $evmNetworkId) {\n      ...EvmNetwork\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query tokens {\n    tokens(orderBy: id_ASC) {\n      ...Token\n    }\n  }\n"
): (typeof documents)["\n  query tokens {\n    tokens(orderBy: id_ASC) {\n      ...Token\n    }\n  }\n"]
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "\n  query tokenById($tokenId: String!) {\n    tokenById(id: $tokenId) {\n      ...Token\n    }\n  }\n"
): (typeof documents)["\n  query tokenById($tokenId: String!) {\n    tokenById(id: $tokenId) {\n      ...Token\n    }\n  }\n"]

export function graphql(source: string) {
  return (documents as any)[source] ?? {}
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never
