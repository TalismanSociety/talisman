# Talisman Wallet

<img src="talisman.svg" alt="Talisman" width="15%" align="right" />

[![website-link](https://img.shields.io/website?label=talisman.xyz&style=flat-square&up_message=online&url=https%3A%2F%2Ftalisman.xyz)](https://talisman.xyz)
[![discord-link](https://img.shields.io/discord/858891448271634473?logo=discord&logoColor=white&style=flat-square)](https://discord.gg/talisman)
[![chrome-users-count](https://img.shields.io/chrome-web-store/users/fijngjgcjhjmmpcmkeiomlglpeiijkld?logo=google-chrome&logoColor=white&style=flat-square)](https://chromewebstore.google.com/detail/talisman-ethereum-and-pol/fijngjgcjhjmmpcmkeiomlglpeiijkld)  
[![chrome-web-store-link](https://img.shields.io/chrome-web-store/v/fijngjgcjhjmmpcmkeiomlglpeiijkld?logo=google-chrome&logoColor=white&style=flat-square)](https://chromewebstore.google.com/detail/talisman-ethereum-and-pol/fijngjgcjhjmmpcmkeiomlglpeiijkld)
[![firefox-addon-link](https://img.shields.io/amo/v/talisman-wallet-extension?logo=firefox&logoColor=white&style=flat-square)](https://addons.mozilla.org/en-US/firefox/addon/talisman-wallet-extension)

**Multi-Chain Made Easy** with Talisman Wallet.  
An ultra-secure Ethereum and Polkadot wallet for both beginners and pros.

## What's inside?

This repo contains the source code for Talisman Wallet.  
If you want to use Talisman, you can [install it for your browser by following this link](https://talisman.xyz/download).

If you would like to build Talisman from source, please continue reading:

## System requirements

If you haven't already, you will first need to install **[Node.js](https://nodejs.org/en/download)** on your system.  
This repo uses **[corepack](https://github.com/nodejs/corepack)** and **[pnpm](https://pnpm.io)** to manage dependencies.  
Corepack is [distributed by default with all recent Node.js versions](https://nodejs.org/api/corepack.html).

**Pnpm** is a fast, _disk space efficient_ javascript package manager.  
**Corepack** lets you use **pnpm** without having to install a specific version of it.

Once you have installed **Node.js**, run `corepack enable` to turn it on, then follow the [Getting started](#getting-started-wallet-extension-development) instructions to continue.

## Getting started (wallet extension development)

1. Install **Node.js** and enable **corepack**, as per the [System Requirements](#system-requirements) section.

1. Clone the repo.

   `git clone git@github.com:TalismanSociety/talisman.git`

1. Change to the repo directory.

   `cd talisman`

1. Install nodejs

   `nvm install`

1. Install dependencies.

   `pnpm install`

1. Start the dev server (uses WXT/Vite for fast rebuilds and HMR).

   `pnpm dev:extension`

1. Open Chrome and navigate to `chrome://extensions`.
1. Turn on the `Developer mode` toggle on the top right of the page.
1. Click `Load unpacked` on the top left of the page and select the `apps/extension/.output/chrome-mv3-dev` directory.
1. Change some code! The extension will hot-reload automatically.

### Firefox Development

To develop for Firefox instead:

```bash
pnpm wxt:dev:firefox
```

Then load the extension from `apps/extension/.output/firefox-mv3-dev` in Firefox's `about:debugging` page.

## Apps and packages

- `apps/extension`: the non-custodial Talisman Wallet browser extension (built with [WXT](https://wxt.dev/)/Vite)
- `packages/eslint-config`: shared `eslint` configurations
- `packages/tsconfig`: shared `tsconfig.json`s used throughout the monorepo
- `packages/util`: library containing shared non-react code. It is not meant to be npm published.

All our apps and packages are 100% [TypeScript](https://www.typescriptlang.org/).

## Writing and running tests

- Testing is carried out with Jest.
- Tests can be written in `*.spec.ts` files, inside a `__tests__` folder.
- Follow the pattern in `apps/extension/src/core/handlers/Extension.spec.ts` or `apps/extension/src/core/domains/signing/__tests__/requestsStore.spec.ts`
- Tests are run with `pnpm test`

## i18n (wallet extension development)

We use i18next in the wallet to make it available in a bunch of languages.

When building UI features, please follow the following spec to ensure they're translatable:

1. Import the `useTranslation` hook into your React components:

   ```tsx
   import { useTranslation } from "react-i18next"
   ```

1. Use the hook in your component to get access to the `t` function:

   ```tsx
   const { t } = useTranslation()
   ```

1. Wrap any user-visible language in your component with the `t` function:

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

1. If you want to include any react components in your translation, you will need to use the `Trans` component:

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

1. If you see one of the following errors in your console:

   ```
   locales/en/common.json:1
   Failed to load resource: net::ERR_FILE_NOT_FOUND
   ```

   ```
   i18next::translator: missingKey en common <i18n-key>
   ```

   Then update the english translation files with this command:

   ```sh
   pnpm chore:update-translations
   ```

### Scripts

- `chore:update-translations` : finds all of the i18n strings in the codebase and adds them to the english translations files which i18next loads in development builds of the wallet

#### Development

- `dev` : starts the extension dev server (alias for `dev:extension`)
- `dev:extension` : starts WXT dev server with hot module replacement for Chrome
- `dev:extension:firefox` : starts WXT dev server for Firefox

#### Production Builds

- `build:extension` : builds the extension for Chrome (outputs to `.output/chrome-mv3`)
- `build:extension:firefox` : builds the extension for Firefox (outputs to `.output/firefox-mv3`)
- `build:extension:zip` : creates a distributable zip file for Chrome
- `build:extension:zip:firefox` : creates a distributable zip file for Firefox

### Build the wallet browser extension using Docker

```bash
# builds with docker, outputs in dist folder at the root of the monorepo
rm -rf dist && DOCKER_BUILDKIT=1 docker build --output type=local,dest=./dist .
```

### Update packages

```bash
# Make changes, and then run:
pnpm changeset
# Select the packages which have been modified and write a commit message
```

## Security disclosures

If you find a security issue or exploit, please email us at **security@talisman.xyz**. Please _DO NOT_ create an issue or PR in this repo for security issues.
