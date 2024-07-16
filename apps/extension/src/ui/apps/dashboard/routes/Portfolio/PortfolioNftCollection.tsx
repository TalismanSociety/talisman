import { DashboardNftCollection } from "@ui/domains/Portfolio/AssetsTable/DashboardNftCollection"
import { usePortfolioNfts } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNfts"
import { NftViewModeToggleButton } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { DashboardBreadcrumb } from "../../layout/DashboardBreadcrumb"
import { DashboardPortfolioLayout } from "../../layout/DashboardPortfolioLayout"

const Breadcrumb = () => {
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
      <DashboardBreadcrumb items={items} />
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
    <DashboardPortfolioLayout>
      <Breadcrumb />
      <DashboardNftCollection />
    </DashboardPortfolioLayout>
  )
}
