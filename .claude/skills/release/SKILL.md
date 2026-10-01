---
name: release
description: Cut a new Talisman extension release, from changelog to RC zips. Proposes the semver bump and a Discord-ready changelog from the commits since the last version, waits for the user's approval, then creates the chore/bump-version-vX.Y.Z branch, runs prepare-release, commits, and builds the Chrome and Firefox production zips with an _RC<N> suffix. Use when the user wants to release, cut or prepare a version, bump the version, write release notes or a changelog for Discord, or build a new release candidate (RC2, RC3…) on an existing release branch.
---

# Release the Talisman extension

A release is a `chore/bump-version-vX.Y.Z` branch with one commit, `🔖 bump version vX.Y.Z`, plus production zips in `apps/extension/dist/` named `…-chrome_RC<N>.zip` and `…-firefox_RC<N>.zip`. The user pushes and opens the PR. This skill stops before that.

Run every command from the repo root of the main checkout. Helpers live in `.claude/skills/release/bin/`.

## 1. Pre-flight

Check these before you read any history, so the changelog matches what ships:

- On `dev`, working tree clean, level with `origin/dev` (`git fetch origin dev`, then `git status -sb`). When `dev` is behind, ask before you pull.
- `pnpm dev` is not running: `lsof -nP -iTCP:8254 -sTCP:LISTEN` prints nothing. A commit while it runs breaks the dev build (see `AGENTS.md`). When it runs, ask the user whether to run `pnpm dev:kill`.
- Docker answers `docker info`. The Firefox build runs in Docker.
- `apps/extension/.env` exists. The production build and the translation download read it.

Report every failed check and wait for the user. Do not work around one.

Already on a `chore/bump-version-v*` branch with the bump commit? Then the user wants another RC: go to step 5.

## 2. Propose the bump and the changelog

```sh
.claude/skills/release/bin/release-commits.sh
```

It prints the current version, the newest tag, and every commit since the last version bump on this branch. The tags point at squashed PR-branch commits, so `git describe` and `<tag>..HEAD` give the wrong range: use this script. When it prints a `WARNING`, show it to the user.

**Bump.** Choose from what users get, not from the commit count:

- major: a breaking change for users or dapps (`💥`, a removed dapp API, a dropped browser or chain family). Rare: propose it only with a clear reason.
- minor: a headline feature worth announcing on its own: a new swap or bridge provider, a new network family, a new product area (3.9.0 added the ForeverMoney bridge, 3.10.0 added Blockaid scans).
- patch: everything else: fixes, internal work, and `✨` enhancements to existing features (3.8.1 shipped four `✨` commits as a patch).

When the call is close, propose one and name the alternative in the reason, so the user can switch.

A feature behind a feature flag counts only when it ships switched on: look up the flag in `apps/extension/src/core/domains/app/remoteConfig.default.json`.

**Changelog.** The user pastes it into Discord, so write it for wallet users:

- Leave out what users cannot see: tests (`✅`), docs and agent tooling (`📝`, `🔧`), CI (`💚`), dependency bumps, renames and refactors (`♻️`, `🚚`, `🔥`) with no visible effect.
- Keep a refactor when it changes what users see (for example "Escape closes modals").
- Describe the effect, not the code: "Hardware wallet fees no longer change while you sign", not "freeze SendFunds fees". When a subject does not tell you the effect, read the PRs, all in one call: `.claude/skills/release/bin/pr-details.sh <n> <n>…`.
- Always mention a new or changed fee, and anything else that changes what users pay or receive. When the amount comes from remote config, say so in the proposal and ask the user to confirm the number.
- Merge related commits into one line. Drop PR numbers.
- Stay under 2000 characters, the Discord message limit.

Show the proposal in this shape, the changelog inside a code block so the user can copy it raw:

````
Bump: minor (3.10.0 → 3.11.0), because <one-line reason>

```
**Talisman v3.11.0**

✨ **New**
- …

⚡️ **Improvements**
- …

🐛 **Fixes**
- …
```
````

Drop empty sections.

## 3. Get approval

Ask the user to approve both the bump and the changelog. Revise and show the whole proposal again until they approve both. Nothing changes on disk before approval, so iterating is free.

## 4. Branch, prepare, commit

With `X.Y.Z` the approved version:

1. `git switch -c chore/bump-version-vX.Y.Z`
2. Set `"version"` to `X.Y.Z` in `apps/extension/package.json`. Only this file: the root `package.json` stays `0.0.0`.
3. `pnpm install`
4. `pnpm chore:prepare-release`. It regenerates the API clients and the init data, downloads translations, runs Biome fixes and the typecheck. It can take more than 10 minutes: run it with `run_in_background` and wait for the completion notice. When it fails, show the error and stop. Regenerated clients can break types (3.10.0 needed a fix): fix only with the user's agreement.
5. Write `.changeset/init-chaindata-vX-Y-Z.md`:

   ```md
   ---
   "@talismn/chaindata-provider": patch
   ---

   generate init data
   ```

6. Show `git status --short`. Expect `apps/extension/package.json`, the changeset, `initChaindata.json`, locale files, and maybe generated clients or `remoteConfig.default.json`. Ask about anything else before you stage it.
7. `git add -A && git commit -m "🔖 bump version vX.Y.Z"`. The pre-commit hook runs Biome. When it fails, run `pnpm check:fix`, stage, and commit again. Never use `--no-verify`.

## 5. Build the RC zips

Commit first: both builds put the HEAD sha in the zip name, and the Firefox build reads the working tree.

```sh
RC=$(.claude/skills/release/bin/next-rc.sh X.Y.Z)
```

Compute it once and use it for both browsers. The number counts per version across all shas (RC1 to RC7 for 3.7.2), so a new commit on the branch still gets the next number.

1. `pnpm build:extension:prod`, with `run_in_background`. Then:

   ```sh
   .claude/skills/release/bin/rename-build.sh X.Y.Z chrome "$RC"
   ```

2. `pnpm build:extension:prod:firefox`, with `run_in_background`. It runs two uncached Docker builds, so allow 20 minutes or more. Then:

   ```sh
   .claude/skills/release/bin/rename-build.sh X.Y.Z firefox "$RC"
   ```

   The Firefox build also writes `…-sources.zip`. Leave its name as is.

When a build or a rename fails, show the output and stop. `rename-build.sh` refuses to overwrite a file.

## 6. Hand over

Print the two RC zips and the sources zip with their SHA256 (`shasum -a 256 <file>`). Tell the user to push `chore/bump-version-vX.Y.Z` and open the PR (title `🔖 bump version vX.Y.Z`). Then stop: do not push, do not open the PR, do not tag.
