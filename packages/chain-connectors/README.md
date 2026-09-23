# @talismn/chain-connectors

RPC connections to the networks that the Talisman wallet supports, one connector per platform:

- `ChainConnectorDot`: Polkadot SDK chains, over `@polkadot-api/substrate-client` and `@polkadot-api/ws-provider`
- `ChainConnectorEth`: EVM networks, with cached viem public and wallet clients (`getEvmNetworkPublicClient`, `getEvmNetworkWalletClient`)
- `ChainConnectorSol`: Solana networks, over `@solana/kit` RPC (`getSolRpc`)

The `*Stub` variants connect to a single network from its RPC list, without chaindata.
