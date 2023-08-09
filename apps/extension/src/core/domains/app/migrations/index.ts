import { MigrationStore } from "./store.migrations"
import { Migrations } from "./types"

const migrations: Migrations = []

export const migrationStore = new MigrationStore(migrations)
