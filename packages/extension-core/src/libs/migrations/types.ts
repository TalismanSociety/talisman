import { captureException } from "@sentry/browser"
import { log } from "extension-shared"

/**
 * MigrationContext
 * @description
 * This is the context that is passed to each migration. It currently only includes the password. Because migrations are async,
 * we need to pass the password in the context rather than just accessing it from the store in the migration functions, as the password could be cleaned up
 * in the meantime.
 */
export type MigrationContext = { password: string }

export class MigrationFunction {
  _migration: (context: MigrationContext) => Promise<void>
  _onError: (error: Error) => Promise<void>
  status: "pending" | "complete" | "error" = "pending"
  error: Error | null = null

  constructor(
    migration: (context: MigrationContext) => Promise<void>,
    onError: (error: Error) => Promise<void> = async () => {}
  ) {
    this._migration = migration
    this._onError = onError
  }

  async onError(error: Error) {
    await this._onError(error)
    captureException(error)
    this.error = error
    this.status = "error"
  }

  async apply(context: MigrationContext) {
    try {
      await this._migration(context)
      this.status = "complete"
      return true
    } catch (e) {
      log.error(e)
      this.onError(e as Error)
      return false
    }
  }
}

export type Migration = {
  forward: MigrationFunction
  backward?: MigrationFunction
}

export type Migrations = Migration[]
