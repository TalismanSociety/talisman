# @talismn/chain-connectors

RPC connections to the networks that the Talisman wallet supports, one connector per platform:

- `ChainConnectorDot`: Polkadot SDK chains, over `@polkadot-api/substrate-client` and `@polkadot-api/ws-provider`
- `ChainConnectorEth`: EVM networks, viem clients per network (`getPublicClientForEvmNetwork`, cached; `getWalletClientForEvmNetwork`)
- `ChainConnectorSol`: Solana networks, `@solana/kit` RPC and transport per network (`getRpc`, `getTransport`, cached). The transport fails over through the network's RPCs in order and sends the next request to the RPC that answered last.

The `*Stub` variants connect to a single network from its RPC list, without chaindata.

## One socket per chain in a dapp

A dapp that uses `@talismn/balances` next to polkadot-api would open two sockets to each chain. Give both the same provider factory to share one:

```ts
import { ChainConnectorDot, createSharedWsProvider } from "@talismn/chain-connectors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws"

const getSharedWsProvider = createSharedWsProvider(getWsProvider)
const chainConnector = new ChainConnectorDot(chaindataProvider, { getWsProvider: getSharedWsProvider })
const client = createClient(getSharedWsProvider(network.rpcs))
```

Providers share a socket only when their endpoint lists are equal, so pass the network's `rpcs` from chaindata. The socket stays open while any consumer is connected: the connector no longer reconnects when its last subscription ends.

This replaces polkadot-api's `createWsClient`. `switch()` and `getStatus()` are on the provider that the factory returns, and `switch()` reconnects every consumer of the socket. `chainConnector.reset(networkId)` reconnects only when the network's RPCs changed. Otherwise it joins the open socket again.
