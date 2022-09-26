import gql from "graphql-tag"

export const graphqlUrl = "https://app.gc.subsquid.io/beta/chaindata/next/graphql"

//
// Fragments
//

export const ChainFragment = gql`
  fragment Chain on Chain {
    id
    isTestnet
    sortIndex
    genesisHash
    prefix
    name
    logo
    chainName
    implName
    specName
    specVersion
    nativeToken {
      id
    }
    tokens(orderBy: id_ASC) {
      id
    }
    account
    subscanUrl
    rpcs {
      url
      isHealthy
    }
    isHealthy
    evmNetworks(orderBy: name_ASC) {
      id
    }
    parathreads(orderBy: paraId_ASC) {
      id
      paraId
    }
    paraId
    relay {
      id
    }
  }
`

export const EvmNetworkFragment = gql`
  fragment EvmNetwork on EvmNetwork {
    id
    isTestnet
    sortIndex
    name
    logo
    nativeToken {
      id
    }
    tokens(orderBy: id_ASC) {
      id
    }
    explorerUrl
    rpcs {
      url
      isHealthy
    }
    isHealthy
    substrateChain {
      id
    }
  }
`

export const TokenFragment = gql`
  fragment Token on Token {
    id
    data

    # TODO: Fix (add variants and their relations) when https://github.com/subsquid/squid/issues/41 is merged

    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {
      id
    }
    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {
      id
    }
  }
`

//
// Queries
//

export const chainsQuery = gql`
  {
    chains(orderBy: sortIndex_ASC) {
      ...Chain
    }
  }
  ${ChainFragment}
`

export const evmNetworksQuery = gql`
  {
    evmNetworks(orderBy: sortIndex_ASC) {
      ...EvmNetwork
    }
  }
  ${EvmNetworkFragment}
`

export const tokensQuery = gql`
  {
    tokens(orderBy: id_ASC) {
      ...Token
    }
  }
  ${TokenFragment}
`
