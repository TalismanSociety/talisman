import { classNames } from "@talismn/util"
import { isFavoriteNftAtomFamily } from "@ui/atoms"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useSetting } from "@ui/hooks/useSettings"
import { NftCollection, NftData } from "extension-core"
import { useAtomValue } from "jotai"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"

import { NetworksLogoStack } from "../AssetsTable/NetworksLogoStack"
import { NftDialog } from "../NftDialog"
import { NftImage } from "../NftImage"
import { NftTile } from "../NftTile"
import { useSelectedAccount } from "../useSelectedAccount"
import { getPortfolioNftCollectionPreviewUrl } from "./helpers"
import { usePortfolioNfts } from "./usePortfolioNfts"

const NoNftFound = () => {
  const { t } = useTranslation()
  const { account } = useSelectedAccount()

  const msg = useMemo(
    () => (account ? t("No NFTs found for this account") : t("No NFTs found")),
    [account, t]
  )

  return <div className="text-body-secondary bg-field rounded px-8 py-36 text-center">{msg}</div>
}

export const PopupNfts: FC<{ className?: string }> = () => {
  const [viewMode] = useSetting("nftsViewMode")
  const [dialogNftId, setDialogNftId] = useState<string | null>(null)

  const data = usePortfolioNfts()

  return (
    <div>
      {!data.collections.length ? (
        <NoNftFound />
      ) : viewMode === "list" ? (
        <NftCollectionsList data={data} onNftClick={setDialogNftId} />
      ) : (
        <NftCollectionsGrid data={data} onNftClick={setDialogNftId} />
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

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const floorUsdValue = useMemo(() => {
    const floorUsdValues = collection.marketplaces
      .filter((c) => c.floorUsd !== null)
      .map((c) => c.floorUsd!)
    return floorUsdValues.length ? Math.min(...floorUsdValues) : null
  }, [collection.marketplaces])

  const { t } = useTranslation()

  const navigate = useNavigate()
  const location = useLocation()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) onNftClick(nfts[0].id)
    else navigate(`/portfolio/nfts/${collection.id}${location.search}`)
  }, [collection.id, location.search, navigate, nfts, onNftClick])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-grey-900 hover:bg-grey-800 flex h-32 w-full  items-center gap-8 rounded-sm px-8 text-left"
    >
      <div className="flex grow items-center gap-6 overflow-hidden ">
        <NftImage className="size-16" src={imageUrl} alt={collection.name ?? ""} />
        <div className="flex grow flex-col gap-2 overflow-hidden">
          <div className="truncate text-base font-bold">{collection.name}</div>
          <div>
            <NetworksLogoStack networkIds={networkIds} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div>
          <span className="font-bold">{nfts.length}</span> {nfts.length > 1 ? t("NFTs") : t("NFT")}
        </div>
        <div
          className={classNames(
            "text-body-secondary ",
            floorUsdValue === null && "select-none text-transparent"
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

const NftCollectionsList: FC<{ data: NftData; onNftClick: (nftId: string) => void }> = ({
  data,
  onNftClick,
}) => {
  return (
    <div className="flex flex-col gap-5 text-sm">
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
    [collection.id, data.nfts]
  )

  // favorites are the first ones in the list, can check just the first one
  const isFavorite = useAtomValue(isFavoriteNftAtomFamily(nfts[0].id))

  const imageUrl = useMemo(() => {
    return getPortfolioNftCollectionPreviewUrl(collection, nfts)
  }, [collection, nfts])

  const networkIds = useMemo(() => [...new Set(nfts.map((nft) => nft.evmNetworkId))], [nfts])

  const navigate = useNavigate()
  const location = useLocation()
  const handleClick = useCallback(() => {
    if (nfts.length === 1) onNftClick(nfts[0].id)
    else navigate(`/portfolio/nfts/${collection.id}${location.search}`)
  }, [collection.id, location.search, navigate, nfts, onNftClick])

  return (
    <NftTile
      imageUrl={imageUrl}
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

const NftCollectionsGrid: FC<{ data: NftData; onNftClick: (nftId: string) => void }> = ({
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
