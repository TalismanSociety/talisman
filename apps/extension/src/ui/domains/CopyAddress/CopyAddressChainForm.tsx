import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { ChainId } from "@talismn/chaindata-provider"
import { CopyIcon, QrIcon } from "@talismn/icons"
import { isEthereumAddress } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useBalancesFiatTotalPerNetwork } from "@ui/hooks/useBalancesFiatTotalPerNetwork"
import useChains from "@ui/hooks/useChains"
import { useSetting } from "@ui/hooks/useSettings"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { ChainLogo } from "../Asset/ChainLogo"
import { CopyAddressExchangeWarning } from "./CopyAddressExchangeWarning"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

type ChainFormat = {
  key: string
  chainId: ChainId | null
  prefix: number | null
  name: string
  address: string
}

const ChainFormatButton = ({ format }: { format: ChainFormat }) => {
  const { t } = useTranslation()
  const { setChainId, copySpecific } = useCopyAddressWizard()

  const handleQrClick = useCallback(() => {
    setChainId(format.chainId)
  }, [format.chainId, setChainId])

  const { open: openWarning, isOpen: isWarningOpen, close: closeWarning } = useOpenClose()

  const handleCopyClick = useCallback(() => {
    if (format.chainId === null && !isEthereumAddress(format.address)) openWarning()
    else copySpecific(format.address, format.chainId)
  }, [copySpecific, format.address, format.chainId, openWarning])

  const handleWarningContinueClick = useCallback(() => {
    copySpecific(format.address, format.chainId)
  }, [copySpecific, format.address, format.chainId])

  return (
    <div className="text-body-secondary hover:text-body hover:bg-grey-800 flex h-32 w-full items-center gap-6 px-12">
      {format.chainId ? (
        <ChainLogo className="shrink-0 text-xl" id={format.chainId} />
      ) : (
        <AccountIcon
          className="shrink-0 text-xl "
          address={format.address}
          type="polkadot-identicon"
        />
      )}
      <div className="flex grow flex-col gap-2 overflow-hidden text-left">
        <div className="text-body truncate">{format.name}</div>
        <div className="text-body-secondary truncate text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{shortenAddress(format.address, 10, 10)}</div>
            </TooltipTrigger>
            <TooltipContent>{format.address}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex gap-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton className="text-md" onClick={handleQrClick}>
              <QrIcon />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{t("Show QR code")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton className="text-md" onClick={handleCopyClick}>
              <CopyIcon />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>{t("Copy to clipboard")}</TooltipContent>
        </Tooltip>
      </div>
      <CopyAddressExchangeWarning
        isOpen={isWarningOpen}
        onDismiss={closeWarning}
        onContinue={handleWarningContinueClick}
      />
    </div>
  )
}

const ChainFormatsList = ({ formats }: { formats: ChainFormat[] }) => (
  <div className="flex flex-col">
    {formats.map((format) => (
      <ChainFormatButton key={format.key} format={format} />
    ))}
  </div>
)

export const CopyAddressChainForm = () => {
  const { address } = useCopyAddressWizard()
  const [search, setSearch] = useState("")
  const [includeTestnets] = useSetting("useTestnets")
  const { chains } = useChains({ activeOnly: true, includeTestnets })
  const { t } = useTranslation()

  const account = useAccountByAddress(address)
  const accountChain = useMemo(
    () => account?.genesisHash && chains.find((c) => account?.genesisHash === c.genesisHash),
    [account?.genesisHash, chains]
  )

  const balances = useBalancesByAddress(address ?? "")
  const balancesPerNetwork = useBalancesFiatTotalPerNetwork(balances)

  const SUBSTRATE_FORMAT: Omit<ChainFormat, "address"> = useMemo(
    () => ({
      key: "substrate",
      chainId: null,
      prefix: null,
      name: t("Substrate (Generic)"),
    }),
    [t]
  )
  const formats: ChainFormat[] = useMemo(() => {
    if (!address || !chains.length) return []

    const sortedChains = chains
      .filter((c) => typeof c.prefix === "number" && c.account !== "secp256k1")
      .sort((a, b) => {
        if (balancesPerNetwork[a.id] || balancesPerNetwork[b.id])
          return (balancesPerNetwork[b.id] ?? 0) - (balancesPerNetwork[a.id] ?? 0)
        return (a.name ?? "").localeCompare(b.name ?? "")
      })

    return [
      { ...SUBSTRATE_FORMAT, address: convertAddress(address, null) },
      ...sortedChains.map<ChainFormat>((chain) => ({
        key: chain.id,
        chainId: chain.id,
        prefix: chain.prefix,
        name: chain.name ?? "unknown",
        address: convertAddress(address, chain.prefix),
      })),
    ].filter((f) => !accountChain || accountChain.id === f.chainId)
  }, [address, chains, SUBSTRATE_FORMAT, balancesPerNetwork, accountChain])

  const filteredFormats = useMemo(() => {
    if (!search) return formats
    const lowerSearch = search.toLocaleLowerCase()
    return formats.filter((format) => format.name.toLowerCase().includes(lowerSearch))
  }, [formats, search])

  return (
    <CopyAddressLayout title={t("Select network")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <SearchInput onChange={setSearch} placeholder={t("Search by network name")} autoFocus />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <ChainFormatsList formats={filteredFormats} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
