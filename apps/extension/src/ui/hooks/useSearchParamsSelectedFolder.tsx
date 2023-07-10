import { TreeFolder, TreeItem } from "@core/domains/accounts/store.catalog"
import { AccountsCatalogTree } from "@core/domains/accounts/types"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import useAccountsCatalog from "./useAccountsCatalog"

export const useSearchParamsSelectedFolder = () => {
  const [searchParams] = useSearchParams()

  const portfolioFolderName = searchParams.get("folder")
  const watchedFolderName = searchParams.get("watchedFolder")

  const catalog = useAccountsCatalog()
  const [folder, treeName] = useMemo((): [
    TreeFolder | undefined,
    AccountsCatalogTree | undefined
  ] => {
    if (portfolioFolderName)
      return [catalog.portfolio.find(folderByName(portfolioFolderName)), "portfolio"]

    if (watchedFolderName) return [catalog.watched.find(folderByName(watchedFolderName)), "watched"]

    return [undefined, undefined]
  }, [portfolioFolderName, catalog.portfolio, watchedFolderName, catalog.watched])

  return { folder, treeName }
}

const folderByName =
  (name: string) =>
  (item: TreeItem): item is TreeFolder =>
    item.type === "folder" && item.name === name
