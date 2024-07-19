import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { Breadcrumb } from "@talisman/components/Breadcrumb"

import { NftViewModeToggleButton } from "../PortfolioToolbarNfts"
import { usePortfolioNfts } from "./usePortfolioNfts"

export const NftsBreadcrumb = () => {
  const { t } = useTranslation()
  const { collectionId } = useParams()
  const navigate = useNavigate()

  const { collections } = usePortfolioNfts()
  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId),
    [collections, collectionId]
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
    <div className="flex h-20 items-center justify-between gap-8">
      <div className="grow overflow-hidden">
        <Breadcrumb items={items} />
      </div>
      <div className="shrink-0">
        <NftViewModeToggleButton />
      </div>
    </div>
  )
}
