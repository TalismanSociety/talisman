import { TreeFolder, TreeItem } from "@core/domains/accounts/store.catalog"
import { AccountsCatalogTree } from "@core/domains/accounts/types"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import useAccountsCatalog from "./useAccountsCatalog"

export const useSearchParamsSelectedFolder = () => {
  const [searchParams] = useSearchParams()

  const portfolioFolderId = searchParams.get("folder")
  const watchedFolderId = searchParams.get("watchedFolder")

  const catalog = useAccountsCatalog()
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
