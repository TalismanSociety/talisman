import gql from "graphql-tag"

export const graphqlUrl = "https://app.gc.subsquid.io/beta/chaindata/next/graphql"

export const ChainFragment = gql`
  fragment Chain on Chain {
    id
    isTestnet
    sortIndex
    genesisHash
    prefix
    name
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

export const ChainIsHealthyFragment = gql`
  fragment ChainIsHealthy on Chain {
    id
    rpcs {
      url
      isHealthy
    }
    isHealthy
  }
`

export const EvmNetworkFragment = gql`
  fragment EvmNetwork on EvmNetwork {
    id
    isTestnet
    sortIndex
    name
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
  fragment IToken on IToken {
    __typename
    id
    isTestnet
    symbol
    decimals
    coingeckoId
    rates {
      usd
      eur
    }
  }
  fragment NativeToken on NativeToken {
    ...IToken
    existentialDeposit
    #   TODO: Fix when https://github.com/subsquid/squid/issues/41 is merged
    # 	chain {
    # 		id
    # 		sortIndex
    # 		isTestnet
    # 	}
    # 	evmNetwork {
    # 		id
    # 		isTestnet
    # 	}
  }
  fragment OrmlToken on OrmlToken {
    ...IToken
    existentialDeposit
    stateKey
    chain {
      id
    }
  }
  fragment LiquidCrowdloanToken on LiquidCrowdloanToken {
    ...IToken
    stateKey
    chain {
      id
    }
  }
  fragment LiquidityProviderToken on LiquidityProviderToken {
    ...IToken
  }
  fragment XcToken on XcToken {
    ...IToken
  }
  fragment Erc20Token on Erc20Token {
    ...IToken
    contractAddress
    chain {
      id
    }
    evmNetwork {
      id
    }
  }

  fragment Token on Token {
    id
    squidImplementationDetail {
      ...IToken
      ... on NativeToken {
        ...NativeToken
      }
      ... on OrmlToken {
        ...OrmlToken
      }
      ... on LiquidCrowdloanToken {
        ...LiquidCrowdloanToken
      }
      ... on LiquidityProviderToken {
        ...LiquidityProviderToken
      }
      ... on XcToken {
        ...XcToken
      }
      ... on Erc20Token {
        ...Erc20Token
      }
    }
    squidImplementationDetailNativeToChains(orderBy: sortIndex_ASC) {
      id
    }
    squidImplementationDetailNativeToEvmNetworks(orderBy: name_ASC) {
      id
    }
  }
`
