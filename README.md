# Talisman monorepo

This repository is the monorepo of Talisman projects.

## What's inside?

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

### Apps and Packages

- `apps/extension`: the Talisman browser extension (non-custodial wallet)
- `apps/web`: the Talisman web app (portfolio, NFTs, crowdloans, etc.)
- `packages/eslint-config-talisman`: shared `eslint` configurations
- `packages/tsconfig`: shared `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Setup

```bash
# install dependencies
yarn

# builds and watches all packages/apps with hot reloading
yarn dev
```

### Scripts

- `dev` : builds and watches all packages/apps with hot reloading
- `dev:extension` : when working on extension only, for better color output (dependencies need to be built beforehand)
- `build`: builds the wallet in `packages/apps/extension/dist` folder
- `build:extension:prod` builds the Talisman browser extension (requires sentry settings, Talisman team only)
- `build:extension:canary` : builds the Talisman browser extension test version, with different ID and icon than prod

### Docker build

```bash

# builds with docker, outputs in dist folder at the root of the monorepo
rm -rf dist && DOCKER_BUILDKIT=1 docker build --output type=local,dest=./dist .

```
