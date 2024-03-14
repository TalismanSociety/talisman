import { assert } from "@polkadot/util"
import { captureException } from "@sentry/browser"
import { log } from "extension-shared"
import { BehaviorSubject } from "rxjs"

import { StorageProvider } from "../Store"
import { MigrationContext, Migrations } from "./types"

type MigrationRunnerData = {
  appliedAt: number
}

type MigrationStatus = "unknown" | "pending" | "migrating" | "complete" | "error"

/**
 * MigrationRunner
 * @description
 * This store is used to keep track of migrations that have been applied, and to run migrations on startup.
 * When updating, the store will check which migrations have already been run, and run the remaining ones.
 * If a migration fails, the store will be marked as 'error' and the migration will not be run again.
 *
 */

export class MigrationRunner extends StorageProvider<Record<string, MigrationRunnerData>> {
  status = new BehaviorSubject<MigrationStatus>("unknown")
  isComplete: Promise<boolean>
  migrations: Migrations
  context: MigrationContext | undefined

  /**
   * @param migrations - List of migrations to run
   * @param fakeApply - If true, will mark all migrations as applied, without actually running them. To be used on first install.
   */
  constructor(migrations: Migrations = [], fakeApply = false, context?: MigrationContext) {
    const initialData: Record<string, MigrationRunnerData> = {}

    if (fakeApply) {
      migrations.forEach((_, i) => {
        initialData[i.toString()] = { appliedAt: Date.now() }
      })
    } else if (!context && migrations.length > 0)
      throw new Error("Migration context required when performing migrations")

    super("migrations", {})

    this.context = context
    this.migrations = migrations

    this.isComplete = new Promise((resolve) => {
      this.status.subscribe({
        next: (v) => {
          if (v === "pending") this.applyMigrations()
          if (v === "complete" || v === "error") {
            // cleanup password and other context
            this.context = undefined
            resolve(true)
          }
        },
      })
    })

    if (fakeApply) {
      // initial data has to be set rather than just passed into the super constructor
      this.set(initialData).then(() => {
        this.status.next("complete")
      })
    } else this.init()
  }

  private init() {
    this.get().then((data) => {
      const newStatus = Object.keys(data).length === this.migrations.length ? "complete" : "pending"
      this.status.next(newStatus)
    })
  }

  checkMigration = async (key: string) => {
    const applied = await this.get(key)
    return Boolean(applied)
  }

  applyMigration = async (index: number) => {
    assert(this.context, "Migration context required")
    const migration = this.migrations[index]
    if (!migration) throw new Error(`Migration ${index} not found`)
    const key = index.toString()
    const applied = await this.checkMigration(key)
    if (!applied) {
      const migrated = await migration.forward.apply(this.context)
      if (migrated) {
        return await this.set({ [key]: { appliedAt: Date.now() } })
      }
      throw new Error(`Migration ${key} failed`, { cause: migration.forward.error })
    }
    log.warn(`Migration ${key} already applied, ignoring`)
    return
  }

  reverseMigration = async (index: number) => {
    assert(this.context, "Migration context required")
    const migration = this.migrations[index]
    const key = index.toString()
    const applied = await this.checkMigration(key)

    if (applied) {
      const migrated = migration.backward ? await migration.backward.apply(this.context) : true
      if (migrated) {
        return await this.set({ [key]: undefined })
      }
      throw new Error(`Migration ${key} failed`, { cause: migration.backward?.error })
    }
    log.warn(`Migration ${key} not applied, ignoring`)
    return
  }

  getLatestAppliedMigration = async () => {
    const applied = await this.get()
    const keys = Object.keys(applied)
    const latest = keys.map(Number).sort((a, b) => b - a)[0]
    return latest as number | undefined
  }

  applyMigrations = async () => {
    if (this.status.value !== "pending") return
    this.status.next("migrating")
    const latestApplied = (await this.getLatestAppliedMigration()) ?? -1
    const lastToApply = this.migrations.length - 1
    const pending = Array.from(
      { length: lastToApply - latestApplied },
      (_, i) => latestApplied + 1 + i
    )

    log.debug(`${pending.length} pending migrations`)

    const applied: number[] = []
    try {
      for (const index of pending) {
        log.debug(`Applying migration ${index}`)
        await this.applyMigration(index)
        applied.push(index)
      }
      log.debug(`Applied ${applied.length} migrations`)
      this.status.next("complete")
      return applied
    } catch (e) {
      this.status.next("error")
      log.error(e)
      if ((e as Error).cause) captureException(e)
      const stillPending = pending.filter((i) => !applied.includes(i))
      log.error(`${stillPending.length} migrations were not applied`)
      return false
    }
  }
}
