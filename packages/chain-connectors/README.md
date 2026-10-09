# @talismn/chain-connectors

RPC connections to the networks that the Talisman wallet supports, one connector per platform:

- `ChainConnectorDot`: Polkadot SDK chains, over `@polkadot-api/substrate-client` and `@polkadot-api/ws-provider`
- `ChainConnectorEth`: EVM networks, viem clients per network (`getPublicClientForEvmNetwork`, cached; `getWalletClientForEvmNetwork`)
- `ChainConnectorSol`: Solana networks, `@solana/kit` RPC and transport per network (`getRpc`, `getTransport`, cached). The transport fails over through the network's RPCs in order and sends the next request to the RPC that answered last.

The `*Stub` variants connect to a single network from its RPC list, without chaindata.

`ChainConnectorDotPapi` runs over a dapp's polkadot-api clients instead of opening sockets of its own. A dapp that uses `@talismn/balances` next to polkadot-api then has one socket per chain:

```ts
const chainConnector = new ChainConnectorDotPapi((networkId) => clients[networkId])
```

It supports the requests and the `state_subscribeStorage` subscription that balances uses. A storage subscription queries all its keys at each new best block and reports the values that changed, so each balances subscription costs one `state_queryStorageAt` per block.

Pass a client for every Polkadot SDK network that balances is enabled on, and keep it alive as long as the connector: a subscription stays on the client it started with, and stops updating if that client is destroyed.
