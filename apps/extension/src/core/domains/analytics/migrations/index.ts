import { type Migration, MigrationFunction } from "../../../libs/migrations/types"
import { removeLegacyAnalytics } from "../legacy"

export const migratePosthogDistinctIdToAnalyticsStore: Migration = {
  forward: new MigrationFunction(async () => {}),
}

export const migrateAnaliticsPurgePendingCaptures: Migration = {
  forward: new MigrationFunction(async () => {}),
}

export const migrateRemoveLegacyAnalytics: Migration = {
  forward: new MigrationFunction(removeLegacyAnalytics),
}
