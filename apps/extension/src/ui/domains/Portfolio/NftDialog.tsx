import { Tabs } from "@talisman/components/Tabs"
import { classNames } from "@talismn/util"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import format from "date-fns/format"
import { Nft, NftCollection, NftCollectionMarketplace } from "extension-core"
import { debounce } from "lodash"
import { CSSProperties, FC, PropsWithChildren, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Modal, Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { Address } from "../Account/Address"
import { NetworkAddress } from "../Account/AddressLinkOrCopy"
import { ChainLogo } from "../Asset/ChainLogo"
import { Fiat } from "../Asset/Fiat"
import { NftImage } from "./NftImage"

type MarketPlaceWithFloor = NftCollectionMarketplace & { floorUsd: number }

const TabContentCollection: FC<{
  collection: NftCollection
  nft: Nft
}> = ({ collection, nft }) => {
  const { t } = useTranslation()
  const network = useEvmNetwork(nft.evmNetworkId)

  const floorPrice = useMemo(() => {
    const floorPrices = collection?.marketplaces
      .filter((mp): mp is MarketPlaceWithFloor => typeof mp.floorUsd === "number")
      .sort((mp1, mp2) => mp1.floorUsd - mp2.floorUsd)

    return floorPrices.length ? floorPrices[0].floorUsd : null
  }, [collection?.marketplaces])

  return (
    <>
      <div className="leading-paragraph grid grid-cols-2 gap-8">
        <div className="text-body-secondary">{t("Floor Price")}</div>
        <div className="text-right">
          {floorPrice ? <Fiat amount={floorPrice} forceCurrency="usd" /> : t("Unavailable")}
        </div>
        <div className="text-body-secondary">{t("Items")}</div>
        <div className="text-right">{collection.totalQuantity}</div>
        <div className="text-body-secondary">{t("Holders")}</div>
        <div className="text-right">{collection.distinctOwners}</div>
        <div className="text-body-secondary">{t("Network")}</div>
        <div className="flex items-center justify-end gap-[0.5em]">
          <ChainLogo id={nft.evmNetworkId} className="text-md" />
          <div className="truncate">{network?.name}</div>
        </div>
        <div className="text-body-secondary">{t("Contract")}</div>
        <div className="text-right">
          <NetworkAddress address={nft.contractAddress} networkId={nft.evmNetworkId} />
        </div>
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      {!!collection.description && (
        <div className="space-y-8">
          <div className="text-body-secondary">{t("Description")}</div>
          <div>{collection.description}</div>
        </div>
      )}
    </>
  )
}

const TabContentNft: FC<{
  nft: Nft
}> = ({ nft }) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="leading-paragraph grid grid-cols-2 gap-8">
        {nft.owner && (
          <>
            <div className="text-body-secondary">{t("Owner")}</div>
            <div className="flex items-center justify-end gap-[0.5em]">
              <AccountIcon address={nft.owner} className="text-md" />
              <div className="truncate">
                <Address address={nft.owner} />
              </div>
            </div>
            <div className="text-body-secondary">{t("Acquired on")}</div>
            <div className="text-right">
              {nft.acquiredAt ? format(new Date(nft.acquiredAt), "P") : null}
            </div>
          </>
        )}
      </div>
      <div className="bg-grey-800 h-0.5"></div>
      {!!nft.description && (
        <div className="space-y-8">
          <div className="text-body-secondary">{t("Description")}</div>
          <div>{nft.description}</div>
        </div>
      )}
      {!!nft.properties.length && (
        <div className="space-y-8">
          <div className="text-body-secondary">{t("Properties")}</div>
          <div className="flex flex-wrap gap-4">
            {nft.properties.map(({ name, value }, i) => (
              <div key={i} className="rounded-xs bg-grey-800 px-5 py-2">
                <div className="text-body-secondary text-xs">{name}</div>
                <div className="text-sm">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const ScrollableArea: FC<
  PropsWithChildren & { paddingRight: number; className?: string; innerClassName?: string }
> = ({ paddingRight, className, innerClassName, children }) => {
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const refContainer = useRef<HTMLDivElement>(null)
  const refContent = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollable = refContainer.current
    const content = refContent.current
    if (!scrollable || !content) return

    const handleDetectScroll = debounce(() => {
      setScrollbarWidth(Math.round(scrollable.offsetWidth - scrollable.clientWidth))
    }, 50)

    scrollable.addEventListener("resize", handleDetectScroll)
    content.addEventListener("resize", handleDetectScroll)

    // init
    handleDetectScroll()

    return () => {
      scrollable.removeEventListener("resize", handleDetectScroll)
      content.removeEventListener("resize", handleDetectScroll)
    }
  }, [refContainer])

  const style = useMemo<CSSProperties>(() => {
    return { paddingRight: paddingRight - scrollbarWidth }
  }, [paddingRight, scrollbarWidth])

  return (
    <div
      ref={refContainer}
      className={classNames("scrollable scrollable-700 w-full grow overflow-y-auto", className)}
      style={style}
    >
      <div ref={refContent} className={classNames("w-full", innerClassName)}>
        {children}
      </div>
    </div>
  )
}

const DialogContent: FC<{ onDismiss: () => void; collection: NftCollection; nft: Nft }> = ({
  // onDismiss,
  collection,
  nft,
}) => {
  const { t } = useTranslation()

  const [tab, setTab] = useState("collection")
  const tabs = useMemo(
    () => [
      { label: t("Collection"), value: "collection" },
      { label: t("NFT"), value: "nft" },
    ],
    [t]
  )

  const handleFullScreenViewClick = () => {
    if (nft.imageUrl) window.open(nft.imageUrl, "_blank", "noopener noreferrer")
  }

  return (
    <div
      className={classNames(
        "h-[60rem] max-h-[100dvh] w-[40rem] max-w-[100dvw]",
        "flex flex-col overflow-hidden",
        "lg:h-[60rem] lg:w-[100rem] lg:flex-row lg:rounded-lg",
        "bg-grey-900 shadow"
      )}
    >
      <Tooltip>
        <TooltipTrigger onClick={handleFullScreenViewClick} asChild>
          <div className="shrink-0 cursor-pointer">
            <NftImage className="h-full w-[50rem] rounded-r-none object-cover" src={nft.imageUrl} />
          </div>
        </TooltipTrigger>
        {!!nft.imageUrl && <TooltipContent>{t("View in full screen")}</TooltipContent>}
      </Tooltip>
      <div className="flex grow flex-col gap-12 py-8 pl-12 font-light">
        <div className="pr-12">
          <div className="text-body-secondary leading-paragraph">{collection.name}</div>
          <div className="text-body leading-paragraph text-lg">{nft.name}</div>
        </div>
        <div className="pr-12">
          <Tabs
            tabs={tabs}
            selected={tab}
            onChange={setTab}
            className="m-0 w-full text-base font-light"
          />
        </div>
        <div className="grow overflow-hidden pr-2">
          <ScrollableArea
            // scrollbar should be centered into the 24px empty space used as right-padding for the modal
            paddingRight={20}
            className="h-full w-full"
            innerClassName="leading-paragraph flex flex-col gap-12 text-base font-light pr-2"
          >
            {tab === "collection" && <TabContentCollection collection={collection} nft={nft} />}
            {tab === "nft" && <TabContentNft nft={nft} />}
          </ScrollableArea>
        </div>
      </div>
    </div>
  )
}

export const NftDialog: FC<{
  data?: { nft: Nft; collection: NftCollection }
}> = ({ data }) => {
  const { isOpen, open, close } = useOpenClose()
  const [current, setCurrent] = useState<{ nft: Nft; collection: NftCollection }>()

  useEffect(() => {
    if (data) {
      setCurrent(data)
      open()
    }
  }, [data, open])

  return (
    <Modal isOpen={isOpen} onDismiss={close}>
      {!!current && <DialogContent {...current} onDismiss={close} />}
    </Modal>
  )
}
