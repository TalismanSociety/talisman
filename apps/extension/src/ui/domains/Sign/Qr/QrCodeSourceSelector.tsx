import { HexString } from "@polkadot/util/types"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useHasVerifierCertificateMnemonic } from "@ui/hooks/useHasVerifierCertificateMnemonic"
import startCase from "lodash/startCase"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Popover, PopoverContent, PopoverTrigger } from "talisman-ui"

import { novaLogoSvg, parityLogoSvg, talismanRedHandSvg } from "./constants"

export type QrCodeSource = "talisman" | "parity" | "novasama" | "other"

const lastSelected = new (class {
  #key = "TalismanQrCodeSourceLastSelected"
  #map = () => new Map<string, QrCodeSource>(JSON.parse(localStorage.getItem(this.#key) ?? "[]"))
  get = (genesisHash?: string) => (genesisHash ? this.#map().get(genesisHash) : undefined)
  set = (genesisHash: string, lastSelected: QrCodeSource) =>
    localStorage.setItem(
      this.#key,
      JSON.stringify(Array.from(this.#map().set(genesisHash, lastSelected)))
    )
})()

export const qrCodeLogoForSource = (source: QrCodeSource) =>
  source === "talisman"
    ? talismanRedHandSvg
    : source === "parity"
    ? parityLogoSvg
    : source === "novasama"
    ? novaLogoSvg
    : undefined

export const useQrCodeSourceSelectorState = (genesisHash?: HexString) => {
  // calculate the list of available sources
  const chain = useChainByGenesisHash(genesisHash)
  const verifierCertificateMnemonic = useHasVerifierCertificateMnemonic()
  const chainspecQrUrl = chain?.chainspecQrUrl
  const latestMetadataQrUrl = chain?.latestMetadataQrUrl
  const sources = useMemo<QrCodeSource[]>(() => {
    const talismanSource: QrCodeSource[] = verifierCertificateMnemonic ? ["talisman"] : []
    return talismanSource.concat(
      ...((): QrCodeSource[] => {
        if (!chainspecQrUrl || !latestMetadataQrUrl) return []

        const isParity = (url: string) => url.startsWith("https://metadata.parity.io/")
        if (isParity(chainspecQrUrl) && isParity(latestMetadataQrUrl)) return ["parity"]

        const isNovasama = (url: string) => url.startsWith("https://metadata.novasama.io/")
        if (isNovasama(chainspecQrUrl) && isNovasama(latestMetadataQrUrl)) return ["novasama"]

        return ["other"]
      })()
    )
  }, [chainspecQrUrl, latestMetadataQrUrl, verifierCertificateMnemonic])

  // use the parity metadata portal source by default for these chains
  const polkadot = useChain("polkadot")
  const kusama = useChain("kusama")
  const westend = useChain("westend")
  const parityDefaultChains = [polkadot?.genesisHash, kusama?.genesisHash, westend?.genesisHash]
  const defaultSourceForChain =
    sources.includes("parity") && parityDefaultChains.includes(genesisHash)
      ? "parity"
      : sources.includes("talisman")
      ? "talisman"
      : undefined

  // remember the last selected source for each chain
  const lastSourceForChain = lastSelected.get(genesisHash)

  // manage the popover state
  const [showPopover, setShowPopover] = useState(false)
  const togglePopover = () => setShowPopover((show) => !show)

  // manage the selected source
  const [source, _setSource] = useState<QrCodeSource | undefined>(
    lastSourceForChain && sources.includes(lastSourceForChain)
      ? lastSourceForChain
      : defaultSourceForChain
  )
  const setSource = (source: QrCodeSource) => {
    _setSource(source)
    genesisHash && lastSelected.set(genesisHash, source)
    setShowPopover(false)
  }

  return { qrCodeSource: source ?? sources[0], sources, setSource, showPopover, togglePopover }
}

export type QrCodeSourceSelectorProps = {
  className?: string
  qrCodeSource?: QrCodeSource
  sources: QrCodeSource[]
  setSource: (source: QrCodeSource) => void
  showPopover: boolean
  togglePopover: () => void
}

export const QrCodeSourceSelector = ({
  className,
  qrCodeSource,
  sources,
  setSource,
  showPopover,
  togglePopover,
}: QrCodeSourceSelectorProps) => {
  const { t } = useTranslation("request")
  return sources.length > 1 ? (
    <Popover placement="bottom-end" open={showPopover} onOpenChange={togglePopover}>
      <PopoverTrigger asChild>
        <div
          className={classNames("text-body-secondary flex items-center gap-3 text-sm", className)}
        >
          {t("QR Source:")}{" "}
          <button
            type="button"
            className="text-body hover:bg-grey-750 flex cursor-pointer items-center gap-2 rounded-sm p-3"
            onClick={togglePopover}
          >
            {startCase(qrCodeSource)}
            <ChevronDownIcon />
          </button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={classNames(
          "border-grey-800 z-50 flex w-min flex-col whitespace-nowrap rounded-sm border bg-black px-2 py-3 text-left shadow-lg",
          showPopover ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        {sources.map((source) => (
          <button
            type="button"
            key={source}
            onClick={() => setSource(source)}
            className="hover:bg-grey-800 rounded-xs h-20 p-6 text-left"
          >
            {startCase(source)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  ) : null
}
