# e2e

Playwright test scripts for extension e2e tests

## Setup

Go to the e2e directory and install dependencies.
`yarn`

### Node env variables

> Add environment variables to the `.env` file in the root of the e2e directory.

- `TESTING_PASSWORD`: wallet password.
- `TESTING_SEEDPHRASE`: wallet seed phrase.

## Run tests

Run all tests
`yarn: e2e:test`

View test report
`yarn: e2e:report`

## Known pitfalls and troubleshooting

- Playwright can only run tests for extension in headful mode so ensure `headless: false` is set in `playwright.config.ts` file.
- You can debug failed test scripts with Playwright Trace Viewer by opening "trace.zip" in the Playwright HTML reporter.

## Resources

[Playwright documentation](https://playwright.dev/docs/intro)