# Balances Bench

Benchmarking scripts for testing and debugging the `@talismn/balances` module against various chains.

## Prerequisites

Build workspace packages before running any dev scripts:

```sh
pnpm build:packages
```

## Usage

Run a benchmark script in watch mode:

```sh
pnpm --filter balances-bench dev:pah       # Polkadot Asset Hub
pnpm --filter balances-bench dev:polkadot  # Polkadot
pnpm --filter balances-bench dev:ethereum  # Ethereum
pnpm --filter balances-bench dev:solana    # Solana
```

See `package.json` for the full list of available chains.
