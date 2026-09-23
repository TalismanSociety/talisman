# AGENTS.md

Talisman wallet monorepo (pnpm). `apps/extension` is the browser extension (WXT + React). `packages/*` are the `@talismn/*` libraries, published to npm.

## Read first

- `apps/extension/ARCHITECTURE.md`: layers, IPC, and where code goes. Read it before you add, move or import across `core/`, `ui/`, `common/` or `inject/`.
- `CONTEXT.md`: glossary. Read it when a domain term is ambiguous (network or chain, token or asset, planck, earn or staking).
- `packages/<name>/README.md`: what each library does.

## Checks

CI runs these on every PR. Run the ones your change touches before you push.

- Lint and format: `pnpm biome check --error-on-warnings -- <changed files>`. CI checks changed files only. `pnpm check:fix` applies fixes.
- Types: `pnpm typecheck`.
- Unit tests: `pnpm test [path]`, from the repo root.
- Unused code and dependencies: `pnpm knip`. Dependencies are hoisted, so an import of a package that is missing from its workspace's `package.json` works locally. Knip fails CI on it.
- Direct dependency licenses: `pnpm check:licenses`.

## Conventions

- Workspace packages resolve from source (`@talismn/source` export condition, WXT and vitest aliases). Dev, typecheck and tests never need a package build.
- A change to any file under `packages/<name>/` needs a changeset in the same PR, else CI fails. Add `.changeset/<slug>.md` with the package name, the bump level and a one-line summary. `apps/extension` has no changesets.
- Polkadot SDK chains: use `polkadot-api` (papi) with `@talismn/sapi` and `@talismn/scale`. The repo has no `@polkadot/api`. Chain descriptors live in `.papi/`; `pnpm papi` regenerates them.
- UI text: `t("Plain English sentence")`. The English text is the translation key. `public/locales/` is downloaded from SimpleLocalize by `pnpm chore:download-translations`, so change the English source string only.
- Generated code: change the generator input, then regenerate.
  - OpenAPI clients `Sn45Api.ts`, `TaoDataApi.ts`, `RemoteConfigApi.ts`: `pnpm chore:generate-clients`.
  - `stealthex.api.d.ts`: `pnpm --filter extension chore:codegen:stealthex-swaps`.
  - Bundled init data (chaindata, remote config): `pnpm chore:generate-init-data`.
- Guard tests in `apps/extension/src/__tests__/` enforce repo-wide rules. When one fails, read that test: its header explains the rule.
- Commit messages: gitmoji plus a short label, e.g. `🐛 fail fast on rate-limited rpc validation`.
- Scratch files go in `.tmp/` (gitignored).

## Dev build

`pnpm dev` builds `apps/extension/dist/chrome-mv3-dev` and opens Chrome with a persistent profile in `~/.talisman-dev/chrome-data`. `NOBROWSER=1 pnpm dev` builds without opening a browser.
