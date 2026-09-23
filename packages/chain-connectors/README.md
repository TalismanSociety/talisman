# @talismn/chain-connectors

RPC connections to the networks that the Talisman wallet supports, one connector per platform:

- `ChainConnectorDot`: Polkadot SDK chains, over `@polkadot-api/substrate-client` and `@polkadot-api/ws-provider`
- `ChainConnectorEth`: EVM networks, viem clients per network (`getPublicClientForEvmNetwork`, cached; `getWalletClientForEvmNetwork`)
- `ChainConnectorSol`: Solana networks, `@solana/kit` RPC and transport per network (`getRpc`, `getTransport`, cached)

The `*Stub` variants connect to a single network from its RPC list, without chaindata.
