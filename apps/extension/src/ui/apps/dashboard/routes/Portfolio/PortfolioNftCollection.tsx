import { ChevronLeftIcon } from "@talismn/icons"
import { DashboardNftCollection } from "@ui/domains/Portfolio/AssetsTable/DashboardNftCollection"
import { usePortfolioNfts } from "@ui/domains/Portfolio/AssetsTable/usePortfolioNfts"
import { NftImage } from "@ui/domains/Portfolio/NftImage"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { GenericStatistics } from "@ui/domains/Portfolio/Statistics"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { DashboardPortfolioLayout } from "../../layout/DashboardPortfolioLayout"

const CollectionStats: FC = () => {
  const { collectionId } = useParams()
  const navigate = useNavigate()

  const { collections, nfts } = usePortfolioNfts()
  const collection = useMemo(
    () => collections.find((c) => c.id === collectionId),
    [collections, collectionId]
  )

  const imageUrl = useMemo(() => {
    return (
      collection?.imageUrl ??
      nfts
        .filter((nft) => !!collection && nft.collectionId === collection.id)
        .map((nft) => nft.previews.small ?? nft.imageUrl)
        .find((url) => !!url) ??
      null
    )
  }, [collection, nfts])

  const handleBackBtnClick = useCallback(() => navigate("/portfolio/nfts"), [navigate])
  const { t } = useTranslation()

  return (
    <div className="flex h-48 w-full gap-8">
      <div className="flex grow flex-col justify-center gap-8">
        <button
          className="text-body-secondary hover:text-grey-300 text:text-sm flex cursor-pointer items-center whitespace-nowrap bg-none p-0 text-base"
          type="button"
          onClick={handleBackBtnClick}
        >
          <ChevronLeftIcon />
          <span className="text-sm">{t("Collection")}</span>
        </button>
        <div className="flex items-center gap-6">
          <NftImage src={imageUrl} className="text-3xl" />
          <div className="text-md truncate font-light">{collection?.name}</div>
        </div>
      </div>
      <GenericStatistics className="max-w-[40%]" title={t("Owned")}>
        {/* TODO */}TODO
      </GenericStatistics>
      <GenericStatistics className="max-w-[40%]" title={t("Unique Holders")}>
        {/* TODO */}
        {collection?.distinctOwners ?? t("N/A")}
      </GenericStatistics>
      <GenericStatistics className="max-w-[40%]" title={t("Floor Price")}>
        {/* TODO */}TODO
      </GenericStatistics>
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
      <CollectionStats />
      <PortfolioTabs className="invisible mb-6 mt-[3.8rem]" />
      <DashboardNftCollection />
    </DashboardPortfolioLayout>
  )
}
