# Talisman verification map

The maintained source for verifying the user-facing behaviour of the Talisman extension. Read this index, then use the matching feature file as the recipe. [`../SKILL.md`](../SKILL.md) owns launch, doctor, evidence and cleanup.

## Baseline preconditions

- `.claude/skills/verify/bin/doctor.mjs` prints only `PASS` lines.
- `$RUN` exists and `tabs.sh baseline "$RUN"` ran.
- `ab` is `agent-browser --session talisman --cdp 9223`.
- The wallet holds `Guardians` accounts (EVM, SUB, SOL). They are test accounts: the only signers a run may use.
- `EXT` is `chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno`.

## Driving conventions

- Open every extension page with `ab tab new "$EXT/<page>.html#/<route>"`, then `ab wait --text` for its heading.
- Prefer `data-testid`, then role and accessible name, then placeholder, then a snapshot ref.
- Each mutation has an undo in its feature file. Run it before cleanup.
- Read the side effect from the service worker with `sw-eval.mjs`, not only from the screen.

## Proof and skip reporting

- Screenshot the action and the resulting state, with absolute paths into `$RUN`.
- Save each `sw-eval.mjs` read as JSON in `$RUN`.
- Record in `$RUN/notes.md` the feature id and entry point of each artefact, and each entry point skipped with its unmet precondition.

## Feature entry contract

Each feature file has an H1 title, one paragraph on the user-visible behaviour, then exactly four H2 sections in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with agent-browser`, `Gotchas`. Keep implementation detail out; name user paths, handles, required state, commands and observable proof.

## Features

- [Watched account](./watched-account.md): add and remove a watch-only account. Driven end to end on 2026-09-30.
- [Portfolio](./portfolio.md): balances per account and in total, in the dashboard and the popup.
- [Dapp connect and sign](./dapp-connect-sign.md): a web page asks for accounts and a signature through the injected providers.
- [Send funds](./send-funds.md): the popup send wizard, from token choice to a submitted transaction.
- [Connected sites](./connected-sites.md): review, disconnect and forget dapp connections in Settings.

Only the watched-account recipe has been driven. The other four come from the source code and earlier sessions: the first run that drives one corrects its handles.
