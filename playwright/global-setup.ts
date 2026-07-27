// Runs once when playwright actually executes tests — unlike playwright.config.ts,
// which is also imported by static tooling (knip) where side effects would be noise.
const globalSetup = () => {
  if (!(process.env.E2E_GANDALF_INSTALL_ID && process.env.E2E_GANDALF_PRIVATE_KEY)) {
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
}

export default globalSetup
