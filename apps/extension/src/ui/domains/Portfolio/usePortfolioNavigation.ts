import { isAddressEqual, normalizeAddress } from "@talismn/util"
import { AccountJsonAny, Tree, TreeAccount, TreeFolder, TreeItem } from "extension-core"
import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"

export const usePortfolioNavigation = () => {
  const { accounts: allAccounts, portfolioAccounts, catalog } = usePortfolioAccounts()
  const [searchParams, updateSearchParams] = useSearchParams()

  const [accountAddress, folderId] = useMemo(
    () => [searchParams.get("account"), searchParams.get("folder")],
    [searchParams],
  )

  const treeName = useMemo(() => {
    if (accountAddress) {
      if (isAddressInTree(catalog.portfolio, accountAddress)) return "portfolio"
      if (isAddressInTree(catalog.watched, accountAddress)) return "watched"
    }

    if (folderId) {
      if (isFolderInTree(catalog.portfolio, folderId)) return "portfolio"
      if (isFolderInTree(catalog.watched, folderId)) return "watched"
    }

    return null
  }, [catalog, folderId, accountAddress])

  const selectedFolder = useMemo(() => {
    if (!folderId) return null
    if (treeName === "portfolio") return catalog.portfolio.find(folderById(folderId)) ?? null
    if (treeName === "watched") return catalog.watched.find(folderById(folderId)) ?? null
    return null
  }, [catalog, treeName, folderId])

  const currentFolder = useMemo(() => {
    if (selectedFolder) return selectedFolder
    if (!accountAddress) return null
    if (treeName === "portfolio")
      return catalog.portfolio.find(folderByAccountAddress(accountAddress)) ?? null
    if (treeName === "watched")
      return catalog.watched.find(folderByAccountAddress(accountAddress)) ?? null
    return null
  }, [accountAddress, catalog.portfolio, catalog.watched, selectedFolder, treeName])

  const setAccountAddress = useCallback(
    (address: string) => {
      searchParams.delete("folder")
      searchParams.set("account", address)
      updateSearchParams(searchParams)
    },
    [searchParams, updateSearchParams],
  )

  const setFolderId = useCallback(
    (folderId: string) => {
      searchParams.set("folder", folderId)
      searchParams.delete("account")
      updateSearchParams(searchParams)
    },
    [searchParams, updateSearchParams],
  )

  const selectedAccount = useMemo<AccountJsonAny | null>(() => {
    return (
      allAccounts.find((acc) => accountAddress && isAddressEqual(acc.address, accountAddress)) ??
      null
    )
  }, [accountAddress, allAccounts])

  const selectedAccounts = useMemo(() => {
    if (selectedAccount) return [selectedAccount]
    if (selectedFolder)
      return (
        allAccounts.filter((acc) =>
          selectedFolder.tree.some((treeAcc) => isAddressEqual(acc.address, treeAcc.address)),
        ) ?? null
      )
    return portfolioAccounts
  }, [allAccounts, portfolioAccounts, selectedAccount, selectedFolder])

  return {
    accountAddress,
    folderId,
    treeName,
    selectedAccount,
    selectedAccounts,
    selectedFolder,
    currentFolder,
    setAccountAddress,
    setFolderId,
  }
}

const isAddressInTree = (tree: Tree, address: string): boolean => {
  try {
    const addresses = tree
      .filter(isTreeAccount)
      .map((account) => account.address)
      .concat(
        tree
          .filter(isTreeFolder)
          .flatMap((folder) => folder.tree.map((account) => account.address)),
      )
      .map((address) => normalizeAddress(address))

    return addresses.includes(normalizeAddress(address))
  } catch (err) {
    return false
  }
}

const isFolderInTree = (tree: Tree, folderId: string): boolean => {
  return tree.some((item) => isTreeFolder(item) && item.id === folderId)
}

const isTreeAccount = (item: TreeItem): item is TreeAccount => item.type === "account"

const isTreeFolder = (item: TreeItem): item is TreeFolder => item.type === "folder"

const folderById =
  (id: string) =>
  (item: TreeItem): item is TreeFolder =>
    isTreeFolder(item) && item.id === id

const folderByAccountAddress =
  (address: string) =>
  (item: TreeItem): item is TreeFolder =>
    isTreeFolder(item) && item.tree.some((account) => isAddressEqual(account.address, address))
