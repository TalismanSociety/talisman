import { TreeFolder } from "@core/domains/accounts/store.portfolio"
import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import useAccountsPortfolio from "./useAccountsPortfolio"

export const useSearchParamsSelectedFolder = () => {
  const [searchParams] = useSearchParams()

  const folderName = searchParams.get("folder")

  const portfolio = useAccountsPortfolio()
  const folder = useMemo(
    () =>
      portfolio.find(
        (item): item is TreeFolder => item.type === "folder" && item.name === folderName
      ),
    [folderName, portfolio]
  )

  return { folder }
}
