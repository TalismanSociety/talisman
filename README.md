# Talisman monorepo

This repository is the monorepo for Talisman projects.

## What's inside?

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

## System Requirements

Node version >18
Yarn version >1.2

This README was written and verified with:

- Node v18.16.0
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

   `cd talisman`

3. Install dependencies and generate the english translation files (these are loaded by i18next during development).

   `yarn && yarn update:translations`

4. Start the dev server, waiting for it to generate the `dist` directory.

   `yarn dev:extension`

5. Open Chrome and navigate to `chrome://extensions`.
6. Turn on the `Developer mode` toggle on the top right of the page.
7. Click `Load unpacked` on the top left of the page and select the `apps/extension/dist` directory.
8. Change some code!

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

// uses the `admin` namespace (`apps/extension/public/locales/en/admin.json`)
const { t } = useTranslation("admin")
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

5. If you see one of the following errors in your console:

```
locales/en/common.json:1
Failed to load resource: net::ERR_FILE_NOT_FOUND
```

```
i18next::translator: missingKey en common <i18n-key>
```

Then update the english translation files with this command:

```sh
yarn update:translations
```

### Scripts

- `update:translations` : finds all of the i18n strings in the codebase and adds them to the english translations files which i18next loads in development builds of the wallet
- `dev` : builds and watches all packages/apps with hot reloading
- `dev:extension` : when working on extension only, for better color output
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
```
