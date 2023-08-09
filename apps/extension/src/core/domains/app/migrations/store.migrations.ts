import { StorageProvider } from "@core/libs/Store"
import { log } from "@core/log"
import { captureException } from "@sentry/browser"
import { BehaviorSubject } from "rxjs"

import { Migrations } from "./types"

type MigrationStoreData = {
  appliedAt: number
}

type MigrationStatus = "unknown" | "pending" | "migrating" | "complete" | "error"

/**
 * MigrationStore
 * @description
 * This store is used to keep track of migrations that have been applied, and to run migrations on startup.
 * When updating, the store will check which migrations have already been run, and run the remaining ones.
 * If a migration fails, the store will be marked as 'error' and the migration will not be run again.
 *
 */

export class MigrationStore extends StorageProvider<Record<string, MigrationStoreData>> {
  status = new BehaviorSubject<MigrationStatus>("unknown")
  isComplete: Promise<boolean>
  migrations: Migrations

  /**
   * @param migrations - List of migrations to run
   * @param fakeApply - If true, will mark all migrations as applied, without actually running them. To be used on first install.
   */
  constructor(migrations: Migrations = [], fakeApply = false) {
    const initialData: Record<string, MigrationStoreData> = {}

    if (fakeApply) {
      migrations.forEach((_, i) => {
        initialData[i.toString()] = { appliedAt: Date.now() }
      })
    }

    super("migrations", {})

    this.isComplete = new Promise((resolve) => {
      this.status.subscribe({
        next: (v) => {
          if (v === "pending") this.applyMigrations()
          if (v === "complete" || v === "error") resolve(true)
        },
      })
    })

    this.migrations = migrations
    if (fakeApply) {
      // initial data has to be set rather than just passed into the super constructor
      this.set(initialData).then(() => {
        this.init(fakeApply)
      })
    } else this.init(fakeApply)
  }

  private init(fakeApply = false) {
    if (!fakeApply) {
      this.get().then((data) => {
        const newStatus =
          Object.keys(data).length === this.migrations.length ? "complete" : "pending"
        this.status.next(newStatus)
      })
    } else this.status.next("complete")
  }

  checkMigration = async (key: string) => {
    const applied = await this.get(key)
    return Boolean(applied)
  }

  applyMigration = async (index: number) => {
    const migration = this.migrations[index]
    if (!migration) throw new Error(`Migration ${index} not found`)
    const key = index.toString()
    const applied = await this.checkMigration(key)
    if (!applied) {
      const migrated = await migration.forward.apply()
      if (migrated) {
        return await this.set({ [key]: { appliedAt: Date.now() } })
      }
      throw new Error(`Migration ${key} failed`, { cause: migration.forward.error })
    }
    log.warn(`Migration ${key} already applied, ignoring`)
    return
  }

  reverseMigration = async (index: number) => {
    const migration = this.migrations[index]
    const key = index.toString()
    const applied = await this.checkMigration(key)

    if (applied) {
      const migrated = migration.backward ? await migration.backward.apply() : true
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
    const latestApplied = (await this.getLatestAppliedMigration()) ?? -1
    const lastToApply = this.migrations.length - 1
    const pending = Array.from(
      { length: lastToApply - latestApplied },
      (_, i) => latestApplied + 1 + i
    )
    if (pending.length > 0) this.status.next("migrating")
    try {
      const result: number[] = []
      for (const index of pending) {
        await this.applyMigration(index)
        result.push(index)
      }

      this.status.next("complete")
      return result
    } catch (e) {
      this.status.next("error")
      log.error(e)
      if ((e as Error).cause) captureException(e)
      const stillPending = this.migrations.slice(latestApplied + 1)
      log.error(`${stillPending} migrations were not applied`)
      return false
    }
  }
}
