import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { DashboardNftCollection } from "@ui/domains/Portfolio/Nfts/DashboardNftCollection"
import { usePortfolioNfts } from "@ui/domains/Portfolio/Nfts/usePortfolioNfts"
import { NftViewModeToggleButton } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { Breadcrumb } from "../../../../../@talisman/components/Breadcrumb"

const DashboardNftsBreadcrumb = () => {
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
        onClick: () => navigate("/portfolio/nfts"),
      },
      {
        label: collection?.name ?? t("Collection"),
        onClick: undefined,
      },
    ]
  }, [collection?.name, navigate, t])

  return (
    <div className="flex items-center justify-between">
      <Breadcrumb items={items} />
      <NftViewModeToggleButton />
    </div>
  )
}

export const PortfolioNftCollection = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <>
      <DashboardNftsBreadcrumb />
      <DashboardNftCollection />
    </>
  )
}
