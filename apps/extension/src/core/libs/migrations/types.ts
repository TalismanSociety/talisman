import { log } from "@core/log"
import { captureException } from "@sentry/browser"

export class MigrationFunction {
  _migration: () => Promise<void>
  _onError: (error: Error) => Promise<void>
  status: "pending" | "complete" | "error" = "pending"
  error: Error | null = null

  constructor(
    migration: () => Promise<void>,
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

  async apply() {
    try {
      await this._migration()
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
