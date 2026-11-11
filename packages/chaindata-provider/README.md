# @talismn/chaindata-provider

Networks and tokens for the Talisman wallet.

- `ChaindataProvider` fetches networks and tokens from the [chaindata](https://github.com/TalismanSociety/chaindata) repository (`CHAINDATA_PUB_FOLDER` in `src/constants.ts`) and supports custom networks and tokens.
- Data is kept in memory. To persist it, pass `persistedStorage` and subscribe to changes.
- To replace the default chaindata file, pass `chaindata$`: an object or an observable of objects in the `ChaindataFile` format. To download a file from a URL, pass `getRemoteChaindata$(url)`. The jsdelivr fallback and the bundled `initChaindata.json` apply only to the default file.
  - The default file is fetched from jsdelivr, at the same repository and ref, only when raw.githubusercontent.com is unreachable or answers with a 5xx. A 4xx, invalid JSON or a file that fails validation is retried with backoff on the same origin.
  - Networks in a `ChaindataFile` (fetched, persisted, bundled or passed as `chaindata$`) keep only their `https://` and `wss://` RPCs. Custom networks accept `http://` and `ws://` RPCs, for local nodes.
  - The provider subscribes to `chaindata$` only while it has subscribers. Pass a replaying observable (a `BehaviorSubject`, or `shareReplay(1)` without `refCount`), else values emitted while nothing is subscribed are lost. A failed observable is resubscribed with backoff, so only a cold observable can recover.
  - The objects that `getRemoteChaindata$` emits are shared and already validated. Treat them as immutable: to filter them, return new objects.
  - `persistedStorage` seeds the data whichever source is used. Clear it when you switch sources.
- Types and guards for networks (`DotNetwork`, `EthNetwork`, `SolNetwork`) and tokens.

`src/state/initChaindata.json` is the bundled fallback. Do not edit it manually: regenerate it before each release with `pnpm chore:generate-init-data`.

To change the mini-metadata format, follow [UPDATING_CHAINDATA.md](UPDATING_CHAINDATA.md).
