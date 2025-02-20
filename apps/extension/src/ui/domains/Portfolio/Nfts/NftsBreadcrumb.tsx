import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { Breadcrumb } from "@talisman/components/Breadcrumb"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useNfts } from "@ui/state"

import { NftViewModeToggleButton, SortByButton } from "../PortfolioToolbarNfts"

export const NftsBreadcrumb = () => {
  const { t } = useTranslation()
  const { collectionId } = useParams()
  const navigate = useNavigateWithQuery()

  const { collections } = useNfts()
  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId),
    [collections, collectionId],
  )

  const items = useMemo(() => {
    return [
      {
        label: t("All NFTs"),
        className: "shrink-0",
        onClick: () => navigate("/portfolio/nfts"),
      },
      {
        label: collection?.name ?? t("Collection"),
        onClick: undefined,
      },
    ]
  }, [collection?.name, navigate, t])

  return (
    <div className="flex h-16 items-center justify-between gap-8">
      <div className="grow overflow-hidden">
        <Breadcrumb items={items} />
      </div>
      <div className="shrink-0">
        <NftViewModeToggleButton />
      </div>
      <div className="shrink-0">
        <SortByButton />
      </div>
    </div>
  )
}
