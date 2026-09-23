# @talismn/balances

<img src="talisman.svg" alt="Talisman" width="15%" align="right" />

[![license](https://img.shields.io/github/license/talismansociety/talisman?style=flat-square)](https://github.com/TalismanSociety/talisman/blob/dev/LICENSE)
[![npm-version](https://img.shields.io/npm/v/@talismn/balances?style=flat-square)](https://www.npmjs.com/package/@talismn/balances)
[![npm-downloads](https://img.shields.io/npm/dw/@talismn/balances?style=flat-square)](https://www.npmjs.com/package/@talismn/balances)

**@talismn/balances** fetches and subscribes to on-chain account token balances for Polkadot SDK, Ethereum (EVM) and Solana networks.

It includes:

- `BalancesProvider`: the API that wallets and dapps use to fetch and subscribe to balances (`getBalances$`)
- `Balances` and `Balance`: classes that aggregate balances and expose `total`, `free`, `locked`, `reserved` and fiat values
- The balance modules, one per token type, which all implement `IBalanceModule`

Networks and tokens come from `@talismn/chaindata-provider`. RPC connections come from `@talismn/chain-connectors`.

### Balance modules

Each module is a folder in `src/modules/`:

| Module | Tokens |
| --- | --- |
| `substrate-native` | Native tokens of Polkadot SDK chains, including locks, reserves and staking |
| `substrate-assets` | `assets` pallet tokens |
| `substrate-foreignassets` | `foreignAssets` pallet tokens |
| `substrate-tokens` | ORML `tokens` pallet tokens |
| `substrate-hydration` | Hydration multi-currency tokens (`CurrenciesApi` runtime API) |
| `substrate-psp22` | PSP22 (ink! contract) tokens |
| `substrate-dtao` | Bittensor subnet (dTAO) alpha stake |
| `evm-native` | Native tokens of EVM networks |
| `evm-erc20` | ERC20 tokens |
| `evm-uniswapv2` | Uniswap V2 LP tokens |
| `sol-native` | SOL |
| `sol-spl` | SPL tokens |
| `sol-token2022` | Token-2022 tokens |

See `BalancesModules.md` for what a module must do.
