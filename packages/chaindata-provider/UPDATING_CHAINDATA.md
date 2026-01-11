# Updating Chaindata

When mini-metadata requires changes (e.g., adding new storage items or runtime API calls to the balances library), you must bump the mini-metadata version and configure a dedicated publishing folder in chaindata.

---

## Phase 1: Development

### Wallet Monorepo

1. Bump `CHAINDATA_PUB_FOLDER` in `./src/constants.ts`
   - The mini-metadata version that chaindata builds is based on this value
   ```ts
   const CHAINDATA_PUB_FOLDER = "pub/v9"
   ```
2. Add a changeset so CI publishes new package versions
3. Check the CI "Publish snapshot packages" task for the published versions
   ```
   Example: @talismn/balances@0.0.0-pr2291-20260106100658
   ```

### Chaindata Repository

1. Create a new branch (e.g., `feat/chaindata-v9`)
2. Update `package.json` with the snapshot versions published by CI:
   - `@talismn/balances`
   - `@talismn/chaindata-provider`
   - `@talismn/chain-connectors`
3. Update the output folder in `constants.ts` (e.g., `pub/v9`)
4. Run the build commands:
   ```sh
   pnpm fetch-external  # Builds mini-metadata v9 for all chains
   pnpm build           # Outputs pub/v9/chaindata.json
   ```
5. Push the branch and open a PR

### Back in Wallet Monorepo

1. Update `CHAINDATA_BRANCH` in `./src/constants.ts` to point to your chaindata branch
   ```ts
   const CHAINDATA_BRANCH = "feat/chaindata-v9"
   ```

---

## Phase 2: Review

Test the wallet and wait for both PRs (wallet + chaindata) to be reviewed.

> ⚠️ **Important:** Delay merging the chaindata PR until the last moment.
>
> CI jobs that keep chaindata up to date only run on the `main` branch for the _current_ pub folder version. Merging chaindata too early will leave production users without chaindata updates until the next wallet release.

---

## Phase 3: Merge & Ship

While both PRs were under review, CI continuously updated the chaindata `main` branch, creating conflicts. **Do not resolve these manually.**

### Chaindata Repository

1. Revert all data folder changes:
   ```sh
   git checkout main -- data/
   git push
   ```
2. ⚠️ **Verify** the PR contains no changes to `data/cache` or `data/generated`
3. Merge the chaindata PR to `main`
4. Wait for all running actions to complete
5. Manually trigger the `fetch-external` job from the GitHub Actions UI (on `main`)
6. Confirm it completes successfully and the subsequent `build` job outputs `/pub/v9/chaindata.json`

### Wallet Monorepo

1. Reset `CHAINDATA_BRANCH` in `./src/constants.ts` back to `main`
   ```ts
   const CHAINDATA_BRANCH = "main"
   ```
2. Re-test the wallet in dev mode
3. Sync wallet's fallback mini-metadata with chaindata:
   ```sh
   pnpm chore:generate-init-data
   ```
4. Merge to `main`
5. Ship the release 🚀
