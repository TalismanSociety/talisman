If minimetadatas change in anyway, it requires bumping the mini metadata version and setup a dedicated publishing folder in chaindata.

## phase 1 - development

In the wallet monorepo

- bump CHAINDATA_PUB_FOLDER in `./src/constants.ts` (the mini metadata version that `chaindata` will build is based on that)
- add a changeset so CI publishes a new version of the balances and chaindata provider packages
- inspect CI and look for the "Publish snapshot packages" task, you will find the version of the packages there. ex: `@talismn/balances@0.0.0-pr2291-20260106100658`

In chaindata

- create a PR. ex: `feat/chaindata-v9`
- edit `package.json` to set versions to the packages that were published by CI. usually `@talisman/balances`, `@talisman/chaindata-provider` and `@talisman/chain-connectors`
- in constants.ts update the output folder to `pub/v9`
- run `pnpm fetch-external`, which will build mimetadata v9 for all the chains
- run `pnpm build`, which will build the output `pub/v9/chaindata.json` file
- publish the branch and create a PR for it

In this mono repo

- in `./src/constants.ts` update `CHAINDATA_BRANCH` with the name of the chaindata branch created above (ex: `feat/chaindata-v9`)

## phase 2 - review

At this stage, test the wallet, and wait for both chaindata and wallet PRs to be reviewed.
it is important to delay merging the chaindata to the last minute, because the CI jobs that keep chaindata output file up to date only runs on the main branch, and for the current pub folder version.
=> merging chaindata too early would leave production users without chaindata updates until next wallet release.

## phase 3 - merge and ship

Before merging the chaindata PR, keep in mind that while both PRs were being reviewed, CI continuously updated main branch, creating a lot of conflicts that should not be handled manually.

In chaindata:

- Revert all changes to the data/ folders using `git checkout main -- data/` then push the changes
- ⚠️ Ensure that the PR doesnt contain any changes to the data/cache and data/generated folders
- merge the chaindata PR to main
- wait until no actions are running then manually run the fetch-external job from the web GUI, on main branch
- ensure it runs properly and is followed by a build job, which should output the `/pub/v9/chaindata.json` file

In wallet monorepo

- in `./src/constants.ts` change the `CHAINDATA_BRANCH` variable back to `main`
- retest the wallet in dev mode, and update the branch
- run `pnpm chore:generate-init-data` which will sync our default/compact minimetadata with chaindata
- merge to main
- ship a release
