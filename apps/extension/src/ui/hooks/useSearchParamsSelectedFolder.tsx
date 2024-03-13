import { AccountsCatalogTree, TreeFolder, TreeItem } from "@extension/core"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import { usePortfolioAccounts } from "./usePortfolioAccounts"

export const useSearchParamsSelectedFolder = () => {
  const { catalog } = usePortfolioAccounts()
  const [searchParams] = useSearchParams()

  const portfolioFolderId = searchParams.get("folder")
  const watchedFolderId = searchParams.get("watchedFolder")

  const [folder, treeName] = useMemo((): [
    TreeFolder | undefined,
    AccountsCatalogTree | undefined
  ] => {
    if (portfolioFolderId)
      return [catalog.portfolio.find(folderById(portfolioFolderId)), "portfolio"]

    if (watchedFolderId) return [catalog.watched.find(folderById(watchedFolderId)), "watched"]

    return [undefined, undefined]
  }, [portfolioFolderId, catalog.portfolio, watchedFolderId, catalog.watched])

  return { folder, treeName }
}

const folderById =
  (id: string) =>
  (item: TreeItem): item is TreeFolder =>
    item.type === "folder" && item.id === id
