import { MigrationRunner } from "./runner"
import { Migration, MigrationFunction } from "./types"

const migrationForward = new MigrationFunction(async () => {})
const migrationBackward = new MigrationFunction(async () => {})
const voidMigration: Migration = {
  forward: migrationForward,
  backward: migrationBackward,
}

const badMigration: Migration = {
  forward: new MigrationFunction(async () => {
    throw new Error("bad migration")
  }),
  backward: migrationBackward,
}

jest.setTimeout(5_000)

describe("MigrationRunner", () => {
  beforeEach(() => {
    new MigrationRunner().clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("should apply migrations", async () => {
    const migrations = [voidMigration, voidMigration]
    const runner = new MigrationRunner(migrations, false, { password: "test" })
    expect(runner.status.value).toEqual("unknown")
    await runner.isComplete
    const latest = await runner.getLatestAppliedMigration()
    expect(latest).toBe(migrations.length - 1)
    expect(runner.status.value).toEqual("complete")
  })

  it("should apply migrations in order", async () => {
    const migrations = [voidMigration, voidMigration]
    const spy = jest.spyOn(migrations[0].forward, "apply")
    const runner = new MigrationRunner(migrations, false, { password: "test" })
    await runner.isComplete
    expect(spy).toHaveBeenCalled()
  })

  it("should handle errors", async () => {
    const migrations = [badMigration, voidMigration]
    const errorSpy = jest.spyOn(migrations[0].forward, "onError")

    const runner = new MigrationRunner(migrations, false, { password: "test" })
    await runner.isComplete
    expect(errorSpy).toHaveBeenCalled()
    expect(runner.status.value).toEqual("error")
    await expect(runner.checkMigration("1")).resolves.toEqual(false)
  })

  it("should apply migrations only once", async () => {
    const migrations = [voidMigration, voidMigration]
    const runner = new MigrationRunner(migrations, false, { password: "test" })
    await runner.isComplete

    const runner2 = new MigrationRunner(migrations, false, { password: "test" })
    await runner2.isComplete
    expect(runner.status.value).toEqual("complete")
    expect(runner2.status.value).toEqual("complete")
    const length = Object.keys(await runner.get()).length
    expect(length).toEqual(migrations.length)
  })

  it("should not run migration functions if fakeApply is true", async () => {
    const migrations = [voidMigration, voidMigration]

    const runner = new MigrationRunner(migrations, true)
    await runner.isComplete
    const runnerData = await runner.get()
    expect(Object.keys(runnerData)).toEqual(["0", "1"])
    runner.destroy()

    // now run some migrations for real
    const newMigrations = [...migrations, voidMigration]
    const runner2 = new MigrationRunner(newMigrations, false, { password: "test" })
    await runner2.isComplete

    const runner2Data = await runner2.get()
    expect(Object.keys(runner2Data)).toEqual(["0", "1", "2"])
  })
})
