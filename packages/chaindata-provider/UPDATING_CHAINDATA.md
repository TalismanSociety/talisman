If minimetadatas change in anyway, it requires bumping the mini metadata version and setup a dedicated publishing folder in chaindata.

In this mono repo

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
