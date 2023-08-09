import { MigrationStore } from "./store.migrations"
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

jest.setTimeout(5000)

describe("MigrationStore", () => {
  beforeEach(() => {
    new MigrationStore().clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("should apply migrations", async () => {
    const migrations = [voidMigration, voidMigration]
    const store = new MigrationStore(migrations)
    expect(store.status.value).toEqual("unknown")
    await store.isComplete
    const latest = await store.getLatestAppliedMigration()
    expect(latest).toBe(migrations.length - 1)
    expect(store.status.value).toEqual("complete")
  })

  it("should apply migrations in order", async () => {
    const migrations = [voidMigration, voidMigration]
    const spy = jest.spyOn(migrations[0].forward, "apply")
    const store = new MigrationStore(migrations)
    await store.isComplete
    expect(spy).toHaveBeenCalled()
  })

  it("should handle errors", async () => {
    const migrations = [badMigration, voidMigration]
    const errorSpy = jest.spyOn(migrations[0].forward, "onError")

    const store = new MigrationStore(migrations)
    await store.isComplete
    expect(errorSpy).toHaveBeenCalled()
    expect(store.status.value).toEqual("error")
    await expect(store.checkMigration("1")).resolves.toEqual(false)
  })

  it("should apply migrations only once", async () => {
    const migrations = [voidMigration, voidMigration]
    const store = new MigrationStore(migrations)
    await store.isComplete

    const store2 = new MigrationStore(migrations)
    await store2.isComplete
    expect(store.status.value).toEqual("complete")
    expect(store2.status.value).toEqual("complete")
    const length = Object.keys(await store.get()).length
    expect(length).toEqual(migrations.length)
  })

  it("should throw if migration not found", async () => {
    const migrations = [voidMigration, voidMigration]
    const store = new MigrationStore(migrations)
    await store.isComplete
    await expect(store.applyMigration(2)).rejects.toThrowError("Migration 2 not found")
  })

  it("should not run migration functions if fakeApply is true", async () => {
    const migrations = [voidMigration, voidMigration]

    const store = new MigrationStore(migrations, true)
    await store.isComplete
    const storeData = await store.get()
    expect(Object.keys(storeData)).toEqual(["0", "1"])
    store.destroy()

    // now run some migrations for real
    const newMigrations = [...migrations, voidMigration]
    const store2 = new MigrationStore(newMigrations)
    await store2.isComplete

    const store2Data = await store2.get()
    expect(Object.keys(store2Data)).toEqual(["0", "1", "2"])
  })
})
