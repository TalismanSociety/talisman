# Talisman monorepo

This repository is the monorepo of Talisman projects.

## What's inside?

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

## System Requirements

Node version >14
Yarn version >1.2

This README was written and verified with:

- Node v16.14.0
- Yarn v1.22.11

### Apps and Packages

- `apps/extension`: the Talisman browser extension (non-custodial wallet)
- `packages/eslint-config-talisman`: shared `eslint` configurations
- `packages/tsconfig`: shared `tsconfig.json`s used throughout the monorepo
- `packages/talisman-utils`: library containing shared non-react code. It is not meant to be npm published.

All our package and apps are 100% [TypeScript](https://www.typescriptlang.org/).

## Getting started (wallet extension development)

1. Clone the repo.

   `git clone git@github.com:TalismanSociety/talisman.git`

2. Change to the repo directory.

   `cd extension`

3. Install dependencies and start the dev server, waiting for it to generate the `dist` directory.

   `yarn && yarn dev`

4. Open Chrome and navigate to `chrome://extensions`.
5. Turn on the `Developer mode` toggle on the top right of the page.
6. Click `Load unpacked` on the top left of the page and select the `apps/extension/dist` directory.
7. Change some code!

### Scripts

- `dev` : builds and watches all packages/apps with hot reloading
- `dev:extension` : when working on extension only, for better color output (dependencies need to be built beforehand)
- `build`: builds the wallet in `packages/apps/extension/dist` folder, without sentry keys
- `build:extension:prod` builds the Talisman browser extension (requires sentry settings, Talisman team only)
- `build:extension:canary` : builds the Talisman browser extension test version, with different ID and icon than prod

### Build the wallet browser extension using Docker

```bash

# builds with docker, outputs in dist folder at the root of the monorepo
rm -rf dist && DOCKER_BUILDKIT=1 docker build --output type=local,dest=./dist .

```
