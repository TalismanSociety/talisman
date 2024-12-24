import { StarIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { NftCollection, NftData } from "extension-core"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useIntersection } from "react-use"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useEvmNetworksMap, useIsFavoriteNft, useNfts, useSetting } from "@ui/state"

import { NetworksLogoStack } from "../AssetsTable/NetworksLogoStack"
import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { NftTile } from "../NftTile"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { getNftCollectionFloorUsd, getPortfolioNftCollectionPreviewUrl } from "./helpers"

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

  return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
}

export const PopupNfts: FC<{ className?: string }> = () => {
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
    [collection.id, data.nfts],
  )

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const floorUsdValue = useMemo(() => getNftCollectionFloorUsd(collection), [collection])

  const { t } = useTranslation()

  const navigate = useNavigateWithQuery()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) onNftClick(nfts[0].id)
    else navigate(`/portfolio/nfts/${collection.id}`)
  }, [collection.id, navigate, nfts, onNftClick])

  const evmNetworksMap = useEvmNetworksMap({ activeOnly: true, includeTestnets: true })
  const networkName = useMemo(() => {
    if (networkIds.length !== 1) return null
    const network = evmNetworksMap[networkIds[0]]
    return network?.name ?? null
  }, [evmNetworksMap, networkIds])

  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useIsFavoriteNft(nfts[0].id)

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-grey-900 hover:bg-grey-800 flex h-32 w-full items-center gap-8 rounded-sm px-8 text-left"
    >
      <div className="flex grow items-center gap-6 overflow-hidden">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="flex w-full gap-2 overflow-hidden text-base">
            <div className="truncate font-bold">{collection.name}</div>
            {isFavorite ? <StarIcon className="shrink-0 fill-[#D5FF5C] stroke-[#D5FF5C]" /> : null}
          </div>
          <div className="flex w-full gap-2 overflow-hidden text-base">
            <NetworksLogoStack networkIds={networkIds} />
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
            floorUsdValue === null && "select-none text-transparent",
          )}
        >
          {floorUsdValue !== null ? (
            <Fiat amount={floorUsdValue} forceCurrency="usd" noCountUp />
          ) : (
            "N/A"
          )}
        </div>
      </div>
    </button>
  )
}

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
    [collection.id, data.nfts],
  )

  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useIsFavoriteNft(nfts[0].id)

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

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
    <div ref={refContainer} className="h-[19.6rem] w-[16.7rem]">
      {intersection?.isIntersecting ? <NftCollectionTileInner {...props} /> : null}
    </div>
  )
}

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
    </div>
  )
}
