import { Account } from "@talismn/keyring"

import {
  addAccount,
  folderFilter,
  RequestAccountsCatalogAction,
  runActionsOnTrees,
  Tree,
  TreeAccount,
  TreeFolder,
} from "../helpers.catalog"
import { accountsCatalogStore } from "../store.catalog"

const timestamp = 1739493973173

const getTestAccounts = (): Account[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    type: "keypair",
    curve: "sr25519",
    name: `Account ${i}`,
    address: `account-${i}`,
    createdAt: timestamp + i,
  }))

const toAddresses = (accounts: Account[]): string[] => accounts.map((account) => account.address)

const getTestStartTree = (): Tree => [
  { type: "account", address: "account-1" },
  { type: "account", address: "account-2" },
  {
    type: "folder",
    id: "folder-1",
    name: "Folder 1",
    tree: [
      { type: "account", address: "account-3" },
      { type: "account", address: "account-4" },
    ],
  },
  { type: "account", address: "account-5" },
  { type: "account", address: "account-6" },
  {
    type: "folder",
    id: "folder-2",
    name: "Folder 2",
    tree: [
      { type: "account", address: "account-7" },
      { type: "account", address: "account-8" },
    ],
  },
  { type: "account", address: "account-9" },
  {
    type: "folder",
    id: "empty-folder",
    name: "Empty folder",
    tree: [],
  },
]

describe("accountsCatalogStore", () => {
  beforeEach(async () => {
    // start with empty store for each test
    await accountsCatalogStore.clear()
    expect(await accountsCatalogStore.get()).toEqual({})
  })

  test("empty store maintains the existing order for accounts", async () => {
    const sortedAccounts = getTestAccounts()
    await accountsCatalogStore.sortAccountsByCatalogOrder(sortedAccounts)

    expect(toAddresses(sortedAccounts)).toStrictEqual(toAddresses(getTestAccounts()))
  })

  test("sorts accounts in the order that they are added", async () => {
    // test that existing order is maintained once accounts are added
    await accountsCatalogStore.addAccounts(getTestAccounts().slice(0, 4))
    await accountsCatalogStore.addAccounts(getTestAccounts().slice(4))

    const sortedAccounts = getTestAccounts().slice()
    await accountsCatalogStore.sortAccountsByCatalogOrder(sortedAccounts)

    expect(toAddresses(sortedAccounts)).toStrictEqual(toAddresses(getTestAccounts()))
  })

  test("sorts removed accounts after added accounts", async () => {
    await accountsCatalogStore.addAccounts(getTestAccounts())
    await accountsCatalogStore.removeAccounts(toAddresses(getTestAccounts().slice(0, 2)))

    const sortedAccounts = getTestAccounts().slice()
    await accountsCatalogStore.sortAccountsByCatalogOrder(sortedAccounts)

    const expectedSortedAccounts = [...getTestAccounts().slice(2), ...getTestAccounts().slice(0, 2)]

    expect(toAddresses(sortedAccounts)).toStrictEqual(toAddresses(expectedSortedAccounts))
  })

  test("doesn't add duplicate accounts", async () => {
    await accountsCatalogStore.addAccounts([...getTestAccounts(), ...getTestAccounts()])
    await accountsCatalogStore.addAccounts([...getTestAccounts(), ...getTestAccounts()])
    await accountsCatalogStore.addAccounts([...getTestAccounts(), ...getTestAccounts()])

    const firstTestAccountAddress = getTestAccounts()[0].address
    const portfolioTreeItems = (await accountsCatalogStore.get()).portfolio
    const accountsWithAddress = portfolioTreeItems
      .filter((item): item is TreeAccount => item.type === "account")
      .filter((account) => account.address === firstTestAccountAddress)
    const numAccountsWithAddress = accountsWithAddress.length

    expect(numAccountsWithAddress).toBe(1)
  })

  test("addAccount returns true if accounts were added, false if not", () => {
    const tree = getTestStartTree()

    const newAccountStatus = addAccount(tree, "new-account-1")
    const existingAccountStatus = addAccount(tree, "new-account-1")

    expect(newAccountStatus).toBe(true)
    expect(existingAccountStatus).toBeFalsy()
  })
})

describe("runActionOnTrees", () => {
  test("moving an account", () => {
    const tree = getTestStartTree()
    const actions: RequestAccountsCatalogAction[] = [
      // move account-1 to the end
      { type: "moveAccount", tree: "portfolio", address: "account-1" },

      // move account-2 into the end of folder-2
      { type: "moveAccount", tree: "portfolio", address: "account-2", folderId: "folder-2" },

      // move account-3 into the start of folder-2
      {
        type: "moveAccount",
        tree: "portfolio",
        address: "account-3",
        folderId: "folder-2",
        beforeItem: { type: "account", address: "account-7" },
      },

      // move account-4 into the start of the tree
      {
        type: "moveAccount",
        tree: "portfolio",
        address: "account-4",
        beforeItem: { type: "folder", id: "folder-1" },
      },

      // move account-5 above account-1
      {
        type: "moveAccount",
        tree: "portfolio",
        address: "account-5",
        beforeItem: { type: "account", address: "account-1" },
      },
    ]

    const status = runActionsOnTrees({ portfolio: tree }, actions)
    expect(status).toStrictEqual(true)

    const expectedResult = [
      { type: "account", address: "account-4" },
      {
        type: "folder",
        id: "folder-1",
        name: "Folder 1",
        tree: [],
      },
      { type: "account", address: "account-6" },
      {
        type: "folder",
        id: "folder-2",
        name: "Folder 2",
        tree: [
          { type: "account", address: "account-3" },
          { type: "account", address: "account-7" },
          { type: "account", address: "account-8" },
          { type: "account", address: "account-2" },
        ],
      },
      { type: "account", address: "account-9" },
      {
        type: "folder",
        id: "empty-folder",
        name: "Empty folder",
        tree: [],
      },
      { type: "account", address: "account-5" },
      { type: "account", address: "account-1" },
    ]

    expect(tree).toStrictEqual(expectedResult)
  })

  test("adding a new folder", () => {
    const tree = getTestStartTree()
    const actions: RequestAccountsCatalogAction[] = [
      { type: "addFolder", tree: "portfolio", name: "Test new folder" },
    ]

    const status = runActionsOnTrees({ portfolio: tree }, actions)
    expect(status).toStrictEqual(true)

    const lastFolderId = tree
      .slice()
      .reverse()
      .find((item): item is TreeFolder => item.type === "folder")?.id

    const expectedResult = [
      ...getTestStartTree(),
      { type: "folder", id: lastFolderId, name: "Test new folder", tree: [] },
    ]

    expect(tree).toStrictEqual(expectedResult)
  })

  test("renaming a folder", () => {
    const tree = getTestStartTree()
    const actions: RequestAccountsCatalogAction[] = [
      { type: "renameFolder", tree: "portfolio", id: "folder-1", newName: "Renamed folder 1" },
    ]

    const status = runActionsOnTrees({ portfolio: tree }, actions)
    expect(status).toStrictEqual(true)

    expect(tree.filter(folderFilter).find((folder) => folder.id === "folder-1")?.name).toBe(
      "Renamed folder 1",
    )
  })

  test("moving a folder", () => {
    const tree = getTestStartTree()
    const actions: RequestAccountsCatalogAction[] = [
      // move folder-1 to the end
      { type: "moveFolder", tree: "portfolio", id: "folder-1" },

      // move folder-2 to the start
      {
        type: "moveFolder",
        tree: "portfolio",
        id: "folder-2",
        beforeItem: { type: "account", address: "account-1" },
      },
    ]

    const status = runActionsOnTrees({ portfolio: tree }, actions)
    expect(status).toStrictEqual(true)

    const expectedResult = [
      {
        type: "folder",
        id: "folder-2",
        name: "Folder 2",
        tree: [
          { type: "account", address: "account-7" },
          { type: "account", address: "account-8" },
        ],
      },
      { type: "account", address: "account-1" },
      { type: "account", address: "account-2" },
      { type: "account", address: "account-5" },
      { type: "account", address: "account-6" },
      { type: "account", address: "account-9" },
      {
        type: "folder",
        id: "empty-folder",
        name: "Empty folder",
        tree: [],
      },
      {
        type: "folder",
        id: "folder-1",
        name: "Folder 1",
        tree: [
          { type: "account", address: "account-3" },
          { type: "account", address: "account-4" },
        ],
      },
    ]

    expect(tree).toStrictEqual(expectedResult)
  })

  test("removing a folder", () => {
    const tree = getTestStartTree()
    const actions: RequestAccountsCatalogAction[] = [
      // remove folder-1
      { type: "removeFolder", tree: "portfolio", id: "folder-1" },

      // remove empty-folder
      { type: "removeFolder", tree: "portfolio", id: "empty-folder" },
    ]

    const status = runActionsOnTrees({ portfolio: tree }, actions)
    expect(status).toStrictEqual(true)

    const expectedResult = [
      { type: "account", address: "account-1" },
      { type: "account", address: "account-2" },
      { type: "account", address: "account-5" },
      { type: "account", address: "account-6" },
      {
        type: "folder",
        id: "folder-2",
        name: "Folder 2",
        tree: [
          { type: "account", address: "account-7" },
          { type: "account", address: "account-8" },
        ],
      },
      { type: "account", address: "account-9" },
      { type: "account", address: "account-3" },
      { type: "account", address: "account-4" },
    ]

    expect(tree).toStrictEqual(expectedResult)
  })
})
