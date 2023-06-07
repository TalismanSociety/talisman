# Talisman monorepo

This repository is the monorepo of Talisman projects.

## What's inside?

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

## System Requirements

Node version >18
Yarn version >1.2

This README was written and verified with:

- Node v18.14.2
- Yarn v1.22.19

### Apps and Packages

- `apps/extension`: the Talisman browser extension (non-custodial wallet)
- `packages/eslint-config`: shared `eslint` configurations
- `packages/tsconfig`: shared `tsconfig.json`s used throughout the monorepo
- `packages/util`: library containing shared non-react code. It is not meant to be npm published.

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

## i18n (wallet extension development)

We use i18next in the wallet to make it available in a bunch of languages.

When building UI features, please follow the following spec to ensure they're translatable:

1. Import the `useTranslation` hook into your React components:

```tsx
import { useTranslation } from "react-i18next"
```

2. Use the hook in your component to get access to the `t` function:

```tsx
// uses the `common` namespace (`apps/extension/public/locales/en/common.json`)
const { t } = useTranslation()

// uses the `portfolio` namespace (`apps/extension/public/locales/en/portfolio.json`)
const { t } = useTranslation("portfolio")
```

3. Wrap any user-visible language in your component with the `t` function:

```tsx
return (
  <div className="flex flex-col items-start">
    <div className="text-base">{t("Account Assets")}</div>
    <div className="text-sm">
      {t("Account has {{assetCount}} assets", { assetCount: assets.length })}
    </div>
  </div>
)
```

4. If you want to include any react components in your translation, you will need to use the `Trans` component:

```tsx
import { useTranslation, Trans } from "react-i18next"

const { t } = useTranslation()
return (
  <Trans
    {/* DO NOT FORGET THIS `t` PROP! */}
    t={t}
    defaults="Your <Highlight>{{name}} <Tooltip /></Highlight> address"
    values={{ name: chain.name }}
    components={{
      Highlight: <span className="text-body" />,
      Tooltip: (
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon className="hover:text-body inline align-middle text-xs" />
          </TooltipTrigger>
          <TooltipContent>
            {t(
              "Only use this address for receiving assets on the {{name}} network.",
              {
                name: chain.name,
              }
            )}
          </TooltipContent>
        </Tooltip>
      ),
    }}
)
```

5. Once you've finished building your feature, generate the new translation keys for the locales files (and don't forget to commit them!):

```bash
yarn update:translations
git add apps/extension/public/locales
```

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

### Update packages

```bash
# Make changes, and then run:
yarn changeset
# Select the packages which have been modified and write a commit message


# Later on, after merging some created changesets:
yarn changeset version
# Commit the changed files and then go to the next step, `Publish packages`.


```

### Publish packages

NOTE: This changeset and manual publish stuff is way too error-prone. We should definitely invest some time in automating the process on github ci.  
One consideration to keep in mind is how should we handle non-production npm package updates.  
E.g. we might make some changes to a balances module and want to test it out on subsquid, but not release a new version as it's not yet in a completed state.

```bash
yarn plugin import workspace-tools

yarn npm login
git clean -ffdx packages
yarn
yarn build:packages
yarn workspaces foreach --no-private npm publish --tolerate-republish
```
