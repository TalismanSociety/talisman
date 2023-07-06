import { TreeFolder } from "@core/domains/accounts/store.catalog"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import useAccountsCatalog from "./useAccountsCatalog"

export const useSearchParamsSelectedFolder = () => {
  const [searchParams] = useSearchParams()

  const folderName = searchParams.get("folder")

  const catalog = useAccountsCatalog()
  const folder = useMemo(
    () =>
      catalog.find(
        (item): item is TreeFolder => item.type === "folder" && item.name === folderName
      ),
    [folderName, catalog]
  )

  return { folder }
}
