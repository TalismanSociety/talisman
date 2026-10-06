# Talisman verification map

The maintained source for verifying the user-facing behaviour of the Talisman extension. Read this index, then use the matching feature file as the recipe. [`../SKILL.md`](../SKILL.md) owns launch, doctor, evidence and cleanup.

## Baseline preconditions

- `.claude/skills/verify/bin/doctor.mjs` prints only `PASS` lines.
- `$RUN` exists and `tabs.sh baseline "$RUN"` ran.
- `ab` is `.claude/skills/verify/bin/ab`, as [`../SKILL.md`](../SKILL.md) step 3 defines it: agent-browser on this checkout's browser.
- The wallet holds the test accounts in [Test accounts](#test-accounts).
- `EXT` is `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno`.
- The dev Chrome window may be narrow (1050 px seen). Wide dashboard layouts then clip: a clipped control can ignore `ab find … click`. Use the direct route in the feature file, or click through `ab eval`.

## Test accounts

A run signs only with test accounts. Each developer restores their own wallet backup, so account and recovery phrase names differ from one profile to the next. The recipes name roles, not accounts:

| Role | Type |
| --- | --- |
| `<evm1>`, `<evm2>` | Ethereum |
| `<sub1>`, `<sub2>` | Polkadot |
| `<sol1>`, `<sol2>` | Solana |

`<sub1 name>` and `<sub1 address>` stand for that account's name and address in your wallet. Two accounts per type let a transfer stay between the wallet's own accounts. Which accounts fill these roles is the developer's declaration, not the skill's: read it from your instructions (for example, a name prefix the developer allows you to sign with) before the first signature. With no declaration, the recipes that sign are unreachable: skip them and record the skip in `notes.md`.

Set the test accounts up once in the dev profile, by hand:

1. Use a recovery phrase dedicated to testing, never the one of a personal wallet. Its accounts may hold real funds, but only amounts you accept to lose: the dev profile keeps the phrase on disk, and runs sign with these accounts.
2. Add two accounts per type from it (`$EXT/dashboard.html#/accounts/add/derived?platform=<ethereum|polkadot|solana>`), and tell your agent which they are.
3. For [Send funds](./send-funds.md), fund `<sub1>` with testTAO on Bittensor testnet.

An agent does not create, rename or fund these accounts. When one is missing or has no balance, skip the recipes that need it and record the skip in `notes.md`.

## Driving conventions

- Open every extension page with `ab tab new "$EXT/<page>.html#/<route>"`, then `ab wait --text` for its heading.
- Prefer `data-testid`, then role and accessible name, then placeholder, then a snapshot ref.
- Each mutation has an undo in its feature file. Run it before cleanup.
- Read the side effect from the service worker with `sw-eval.mjs`, not only from the screen.
- Refer to accounts by role (`<sub1>`), never by an account or recovery phrase name from your own profile. A name the run creates itself, such as `Verify Watched`, is fine.

## Proof and skip reporting

- Screenshot the action and the resulting state, with absolute paths into `$RUN`.
- Save each `sw-eval.mjs` read as JSON in `$RUN`.
- Record in `$RUN/notes.md` the feature id and entry point of each artefact, and each entry point skipped with its unmet precondition.

## Feature entry contract

Each feature file has an H1 title, one paragraph on the user-visible behaviour, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, `Gotchas`. Keep implementation detail out; name user paths, handles, required state, commands and observable proof.

## Features

- [Watched account](./watched-account.md): add and remove a watch-only account. Driven end to end on 2026-10-06.
- [Portfolio](./portfolio.md): balances per account and in total, in the dashboard and the popup. Driven on 2026-10-06.
- [Dapp connect and sign](./dapp-connect-sign.md): a web page asks for accounts and a signature through the injected providers. Driven on 2026-10-06 (EVM, Substrate and Solana connect, sign, reject).
- [Send funds](./send-funds.md): the popup send wizard, from token choice to a submitted transaction. Driven on 2026-10-06 with a testTAO transfer.
- [Connected sites](./connected-sites.md): review, disconnect and forget dapp connections in Settings. Driven on 2026-10-06, Solana forget included.
- [Analytics events](./analytics-events.md): read the dev event log through the service worker and trace a flow attempt, including `_abandoned` after the page closes. Driven on 2026-10-06 with the recovery phrase backup flow and the exception probes, all but the error boundary step.

Every recipe has been driven live. A step that fails on a later run is drift: correct the recipe.
