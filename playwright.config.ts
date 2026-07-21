import { defineConfig, devices } from "@playwright/test"
import dotenv from "dotenv"

dotenv.config({ path: "apps/extension/.env" })

// TEST_WORKER_INDEX is only set in worker processes: warn once, from the runner process only
if (
  !process.env.TEST_WORKER_INDEX &&
  !(process.env.E2E_GANDALF_INSTALL_ID && process.env.E2E_GANDALF_PRIVATE_KEY)
) {
  // biome-ignore lint/suspicious/noConsole: intentional warning for test runs
  console.warn(
    [
      "",
      "┌──────────────────────────────────────────────────────────────────────────────┐",
      "│  ⚠️  E2E_GANDALF_INSTALL_ID / E2E_GANDALF_PRIVATE_KEY are not set            │",
      "│                                                                              │",
      "│  Without them, each e2e run registers a fresh Gandalf install, solving a     │",
      "│  proof-of-work in the extension background worker at startup. On slow        │",
      "│  machines this starves the background for 10s+ and makes tests flaky.        │",
      "│                                                                              │",
      "│  Generate credentials with:  pnpm chore:register-gandalf-e2e                 │",
      "│  then add the two printed lines to apps/extension/.env (local runs)          │",
      "│  or to the repository's GitHub Actions secrets (CI).                         │",
      "└──────────────────────────────────────────────────────────────────────────────┘",
      "",
    ].join("\n")
  )
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 60_000, // 60 seconds for all tests
  // assertions poll until they pass; several forms validate asynchronously through the extension
  // background (mnemonic validation, watched-address checks, ...), which on slow CI runners
  // regularly exceeds the 5s default and makes those tests flaky
  expect: { timeout: 15_000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "api",
      testDir: "./playwright/api-tests",
      use: {
        extraHTTPHeaders: { Accept: "application/json" },
      },
    },
    {
      name: "chromium",
      testDir: "./playwright/e2e-tests",
      use: { ...devices["Desktop Chrome"] },
    },
    /* Deactivated for now
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
})
