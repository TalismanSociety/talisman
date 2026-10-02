# PostHog project as code

`provision.ts` sets up the extension's PostHog project from the analytics catalogue in `src/common/analytics`. It writes the project settings, the event and property definitions, the dashboards (one funnel per flow), the alerts and, on request, a release annotation. Each run compares the project with the spec and writes only the difference, so a second run writes nothing.

## Run the provisioning

1. Put these variables in `apps/extension/.env`. The project id, the project token and the hosts are constants in `src/core/domains/analytics/posthogProject.ts`.

   | Variable | Value |
   | --- | --- |
   | `POSTHOG_PERSONAL_API_KEY` | A personal API key with the scopes listed under "API key scopes" |
   | `POSTHOG_ALERTS_DISCORD_WEBHOOK_URL` | Optional. Every alert also posts to this Discord webhook |

2. Read what a run would change:

   ```sh
   pnpm posthog:provision --dry-run --check-queries
   ```

   The dry run reads the live project and writes nothing. `--check-queries` runs every tile's query through `/query/`, which also writes nothing, and fails on an invalid query.

3. On a new catalogue, seed the definitions and apply everything:

   ```sh
   pnpm posthog:provision --seed
   ```

   PostHog creates an event or property definition only after it receives that event. `--seed` sends one event for each catalogue event that has no definition yet, then waits up to 10 minutes for the definitions to appear. Each seed event carries every property of that event and the super properties, `appVariant: "development"` and `$process_person_profile: false`, so the test-account filter hides it. A second `--seed` sends only what is still missing. Error-kind events are never seeded: a seeded exception would open an Error tracking issue.

4. After a release, add its annotation:

   ```sh
   pnpm posthog:provision --annotate-release
   ```

## Change a dashboard, a funnel or an alert

- Flow funnels and flow abandonment tiles come from `flowList()`. A new flow gets them on the next run with no change here. A funnel requires its started, submitted and completed events. The steps between are optional, because a branch of a flow skips some. A transaction flow's completed step counts `status` success only. A flow whose success is another property, such as swap's `swap_status` finished, has an entry in `SUCCESS_OVERRIDES` in `flows.ts`.
- Other tiles live in `buildDashboards` in `dashboards.ts`. Build queries with the helpers in `queries.ts`. A SQL tile needs `{filters}` in its `WHERE` so that the date range and the test-account filter apply.
- Alerts live in `ALERTS` in `dashboards.ts`. An alert watches one series of a trend tile.

`specErrors` checks the spec against the catalogue: every event and property a tile reads must be in the catalogue, each property must be declared by the event the tile reads it on, and every tile name must be unique. Several events share some properties, such as `surface` on `error_shown` and `search_performed`, so a tile that filters on one without its event fails the check. A real run refuses to start on an error. `dashboards.test.ts` runs the same check in CI, so renaming an event that a tile reads fails the tests.

`$exception` is PostHog's event, so it has no catalogue entry. The worker's own properties on it (`exception_type`, `mechanism`, `handled`) are defined in `dashboards.ts`, keyed by `ExceptionProperties`, and synced with the catalogue's. They are never seeded: their definitions come from the first real exception.

Event and property descriptions come from the catalogue. To change one, edit the catalogue, not PostHog: the next run overwrites a description written in the PostHog UI.

## Reference

### Flags

| Flag | Effect |
| --- | --- |
| `--dry-run` | Read the live project and print each write instead of sending it. Without credentials, print the plan only |
| `--seed` | Seed the missing definitions, then wait for them |
| `--check-queries` | Run every tile's query through `/query/` |
| `--only <slug>` | Reconcile one dashboard. Repeatable |
| `--prune` | Soft-delete managed insights that left the spec, and delete their alerts |
| `--skip-definitions` | Leave the event and property definitions alone |
| `--annotate-release` | Add a `Release v<version>` annotation for today, unless one exists |
| `--show-test-accounts` | Save every insight with "Filter out internal and test users" off |
| `--catalogue <dir>` | Read the catalogue from another directory. The default is `src/common/analytics` |
| `--verbose` | Print request bodies. The project token and the webhook URL print as `<redacted>` |

### What a run writes, in order

1. Project settings (`settings.ts`): IP discard, posthog-js capture features off, the test-account filter (`appVariant` is not `development`, `preview` or `canary`) and its default, GeoIP at execution order 1, and the "Keep country and continent only" property filter at order 2.
2. Seed events, with `--seed`.
3. Event and property definitions: description, `verified`, the `aiec-managed` tag, `flow` and `flow:<name>` on flow events, `super` on super properties, and the PostHog property type.
4. Dashboards and their insights, the tile layout, and the primary dashboard (Overview).
5. Alerts, each subscribing the API key's owner, plus one Discord destination each when the webhook variable is set.
6. The release annotation, with `--annotate-release`.

### Ownership

The script owns every dashboard and insight tagged `aiec-managed`, and never reads or writes an untagged one. It matches a dashboard by its title and an insight by its tile name, so reordering dashboards or moving a tile renames the stored object instead of creating another. Renaming a tile creates a new insight: run `--prune` to remove the old one. Alerts carry no tags: the script owns every alert on a managed insight and matches it by name. PostHog has no hard delete for dashboards and insights, so removals set `deleted: true` and can be restored in the PostHog UI.

### API key scopes

`project:read`, `project:write`, `dashboard:read`, `dashboard:write`, `insight:read`, `insight:write`, `query:read`, `alert:read`, `alert:write`, `user:read`, `hog_function:read`, `hog_function:write`, `event_definition:read`, `event_definition:write`, `property_definition:read`, `property_definition:write`, `annotation:read` and `annotation:write`.

### Tests

The `*.test.ts` files run with the extension tests: `pnpm test apps/extension/scripts/posthog`. They read the real catalogue and registry.
