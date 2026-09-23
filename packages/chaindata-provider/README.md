# @talismn/chaindata-provider

Networks and tokens for the Talisman wallet.

- `ChaindataProvider` fetches networks and tokens from the [chaindata](https://github.com/TalismanSociety/chaindata) repository (`CHAINDATA_PUB_FOLDER` in `src/constants.ts`) and supports custom networks and tokens.
- Data is kept in memory. To persist it, pass `persistedStorage` and subscribe to changes.
- Types and guards for networks (`DotNetwork`, `EthNetwork`, `SolNetwork`) and tokens.

`src/state/initChaindata.json` is the bundled fallback. Do not edit it manually: regenerate it before each release with `pnpm chore:generate-init-data`.

To change the mini-metadata format, follow [UPDATING_CHAINDATA.md](UPDATING_CHAINDATA.md).
