import type { NftCollection, NftData } from "@core/domains/nfts/exports"
import { StarIcon } from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useNetworksMapById } from "@ui/state/chaindata"
import { useIsFavoriteNft, useNfts } from "@ui/state/nfts"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { useSetting } from "@ui/state/settings"
import { type FC, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useIntersection } from "react-use"

import { PortfolioNetworksLogoStack } from "../AssetsTable/PortfolioNetworksLogoStack"
import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { NftTile } from "../NftTile"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { getPortfolioNftCollectionPreviewUrl } from "./helpers"
import { NftsUnavailable } from "./NftsUnavailable"

const NoNftFound = () => {
  const { t } = useTranslation()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()

  const { status } = useNfts()

  const msg = useMemo(() => {
    if (status === "loading") return <span className="animate-pulse">{t("Loading NFTs...")}</span>
    return selectedAccount
      ? t("No NFTs found for this account")
      : selectedFolder
        ? t("No NFTs found for this folder")
        : t("No NFTs found")
  }, [selectedAccount, selectedFolder, status, t])

  return <div className="rounded bg-field px-8 py-36 text-center text-body-secondary">{msg}</div>
}

export const PopupNfts = () => {
  const showNfts = useFeatureFlag("NFTS_V2")
  return showNfts ? <PopupNftsInner /> : <NftsUnavailable />
}

const PopupNftsInner = () => {
  const [viewMode] = useSetting("nftsViewMode")
  const [dialogNftId, setDialogNftId] = useState<string | null>(null)

  const data = useNfts()

  return (
    <div>
      {!data.collections.length ? (
        <NoNftFound />
      ) : viewMode === "list" ? (
        <NftCollectionsRows data={data} onNftClick={setDialogNftId} />
      ) : (
        <NftCollectionsTiles data={data} onNftClick={setDialogNftId} />
      )}
      <NftDialog nftId={dialogNftId} onDismiss={() => setDialogNftId(null)} />
    </div>
  )
}

const NftCollectionRowInner: FC<{
  collection: NftCollection
  data: NftData
  onNftClick: (nftId: string) => void
}> = ({ collection, data, onNftClick }) => {
  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.networkId))], [nfts])

  const value = useMemo(() => {
    const values = nfts.map((nft) => nft.price).filter(isNotNil)
    return values.length ? values.reduce((acc, price) => acc + price, 0) : null
  }, [nfts])

  const { t } = useTranslation()

  const navigate = useNavigateWithQuery()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) onNftClick(nfts[0].id)
    else navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection.id, navigate, nfts, onNftClick])

  const allNetworksMap = useNetworksMapById({
    activeOnly: true,
    includeTestnets: true,
  })
  const networkName = useMemo(() => {
    if (networkIds.length !== 1) return null
    const network = allNetworksMap[networkIds[0]]
    return network?.name ?? null
  }, [allNetworksMap, networkIds])

  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useIsFavoriteNft(nfts[0].id)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-32 w-full items-center gap-8 rounded-sm bg-grey-900 px-8 text-left hover:bg-grey-800"
    >
      <div className="flex grow items-center gap-6 overflow-hidden">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="flex w-full gap-2 overflow-hidden text-base">
            <div className="truncate font-bold">{collection.name}</div>
            {isFavorite ? <StarIcon className="shrink-0 fill-[#D5FF5C] stroke-[#D5FF5C]" /> : null}
          </div>
          <div className="flex w-full gap-2 overflow-hidden text-base">
            <PortfolioNetworksLogoStack networkIds={networkIds} />
            <div className="text-body-secondary text-sm">{networkName}</div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div>
          <span className="font-bold">{nfts.length}</span> {nfts.length > 1 ? t("NFTs") : t("NFT")}
        </div>
        <div
          className={classNames(
            "text-body-secondary",
            value === null && "select-none text-transparent"
          )}
        >
          {value !== null ? <Fiat amount={value} forceCurrency="usd" noCountUp /> : "N/A"}
        </div>
      </div>
    </button>
  )
}

const NftCollectionRowSkeleton = () => (
  <div className="flex h-32 items-center justify-between gap-8 rounded-sm bg-grey-900 px-8">
    <div className="flex items-center gap-6">
      <div className="animated-pulse size-16 rounded-sm bg-grey-800"></div>
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full gap-2 overflow-hidden text-base">
          <span className="animate-pulse truncate rounded-sm bg-grey-800 font-bold text-grey-800">
            AAAAAAAAAAA AAAA
          </span>
        </div>
        <div className="flex w-full gap-2 overflow-hidden text-base">
          <span className="animate-pulse rounded-sm bg-grey-800 text-grey-800 text-sm">
            NNNNNNNNNNN
          </span>
        </div>
      </div>
    </div>

    <div className="text-right">
      <span className="animate-pulse rounded-sm bg-grey-800 text-grey-800">1 NFT</span>
    </div>
  </div>
)

const NftCollectionRow: FC<{
  collection: NftCollection
  data: NftData
  onNftClick: (nftId: string) => void
}> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "400px",
  })

  return (
    <div ref={refContainer} className="h-32">
      {intersection?.isIntersecting ? <NftCollectionRowInner {...props} /> : null}
    </div>
  )
}

const NftCollectionsRows: FC<{ data: NftData; onNftClick: (nftId: string) => void }> = ({
  data,
  onNftClick,
}) => {
  return (
    <div className="flex flex-col gap-4 text-sm">
      {data.collections.map((collection, i) => (
        <NftCollectionRow
          key={`${collection.id}-${i}`}
          collection={collection}
          data={data}
          onNftClick={onNftClick}
        />
      ))}
      {data.status === "loading" && <NftCollectionRowSkeleton />}
    </div>
  )
}

const NftCollectionTileInner: FC<{
  collection: NftCollection
  data: NftData
  onNftClick: (nftId: string) => void
}> = ({ collection, data, onNftClick }) => {
  const nfts = useMemo(
    () => data.nfts.filter((nft) => nft.collectionId === collection.id),
    [collection.id, data.nfts]
  )

  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useIsFavoriteNft(nfts[0].id)

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.networkId))], [nfts])

  const navigate = useNavigateWithQuery()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) onNftClick(nfts[0].id)
    else navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection.id, navigate, nfts, onNftClick])

  return (
    <NftTile
      imageUrl={imageUrl}
      count={nfts.length}
      label={collection.name ?? ""}
      networkIds={networkIds}
      isFavorite={isFavorite}
      onClick={handleClick}
    />
  )
}

const NftCollectionTile: FC<{
  collection: NftCollection
  data: NftData
  onNftClick: (nftId: string) => void
}> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  return (
    <div ref={refContainer} className="h-[12.25rem] w-[10.4375rem]">
      {intersection?.isIntersecting ? <NftCollectionTileInner {...props} /> : null}
    </div>
  )
}

const NftCollectionTileSkeleton = () => (
  <div className="w-[10.4375rem]">
    <div className="size-[10.4375rem] animate-pulse rounded-sm bg-grey-800"></div>
  </div>
)

const NftCollectionsTiles: FC<{ data: NftData; onNftClick: (nftId: string) => void }> = ({
  data,
  onNftClick,
}) => {
  return (
    <div className="grid w-full grid-cols-2 gap-8">
      {data.collections.map((collection, i) => (
        <NftCollectionTile
          key={`${collection.id}-${i}`}
          collection={collection}
          data={data}
          onNftClick={onNftClick}
        />
      ))}
      {data.status === "loading" && <NftCollectionTileSkeleton />}
    </div>
  )
}
