# @talismn/chain-connectors

RPC connections to the networks that the Talisman wallet supports, one connector per platform:

- `ChainConnectorDot`: Polkadot SDK chains, over `@polkadot-api/substrate-client` and `@polkadot-api/ws-provider`
- `ChainConnectorEth`: EVM networks, viem clients per network (`getPublicClientForEvmNetwork`, cached; `getWalletClientForEvmNetwork`)
- `ChainConnectorSol`: Solana networks, `@solana/kit` RPC and transport per network (`getRpc`, `getTransport`, cached). The transport fails over through the network's RPCs in order and sends the next request to the RPC that answered last.

Each RPC is checked against the network record before it is sent anything: `chain_getBlockHash(0)` (Polkadot SDK, falling back to `chainSpec_v1_genesisHash`) and `getGenesisHash` (Solana) must return the network's genesis hash, and `eth_chainId` (EVM) the chain id in the network id. An RPC of another chain is skipped and the request fails over to the next one; one whose check fails or times out (10 s on a new Polkadot SDK connection, 5 s for EVM and Solana) counts as failing and is checked again on its next use. Verdicts are kept per network and RPC for the life of the process. A Solana transport from `getSolTransport` is only checked when given a `genesisHash`, and an EVM network whose id is not a chain id is used unchecked.

The `*Stub` variants connect to a single network from its RPC list, without chaindata.

`ChainConnectorDotPapi` runs over a dapp's polkadot-api clients instead of opening sockets of its own. A dapp that uses `@talismn/balances` next to polkadot-api then has one socket per chain:

```ts
const chainConnector = new ChainConnectorDotPapi((networkId) => clients[networkId])
```

It supports the requests and the `state_subscribeStorage` subscription that balances uses. A storage subscription queries all its keys at each new best block and reports the values that changed, so each balances subscription costs one `state_queryStorageAt` per block.

Pass a client for every Polkadot SDK network that balances is enabled on, connected to full nodes over a websocket: balances uses the legacy JSON-RPC methods (`state_queryStorageAt`, `state_call`, `state_getKeysPaged`, …), which light clients do not serve. Keep each client alive as long as the connector, and change its RPCs with the provider's `switch()` rather than by recreating it: a subscription stays on the client it started with, and a destroyed client gives no signal, so its subscriptions stop updating.
