# Talisman Extension

## Getting started (development)

1. Clone the repo.

   `git clone git@github.com:TalismanSociety/extension.git`

2. Change to the repo directory.

   `cd extension`

3. Install dependencies and start the dev server, waiting for it to generate the `dist` directory.

   `yarn && yarn start`

4. Open Chrome and navigate to `chrome://extensions`.
5. Turn on the `Developer mode` toggle on the top right of the page.
6. Click `Load unpacked` on the top left of the page and select the `dist` directory.
7. Change some code!

## Build instructions: Docker

Run:
`rm -rf dist && DOCKER_BUILDKIT=1 docker build --output type=local,dest=./dist .`

## System Requirements

Node version >18
Yarn version >1.2

This README was written and verified with:

- Node v18.14.2
- Yarn v1.22.19

## Writing and running tests

- Testing is carried out with Jest
- Tests can be written in `*.spec.ts` files, inside a `__tests__` folder.
- Follow the pattern in `src/core/handlers/Extension.spec.ts` or `src/core/domains/signing/__tests__/requestsStore.spec.ts`
- Tests are run with `yarn test`

## Security disclosures

If you find a security issue or exploit, please email us at **security@talisman.xyz**. Please _DO NOT_ create an issue or PR in this repo for security issues.
