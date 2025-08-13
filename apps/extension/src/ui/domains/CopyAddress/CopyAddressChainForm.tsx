import { encodeAnyAddress, isEthereumAddress, normalizeAddress } from "@talismn/crypto"
import { ArrowUpRightIcon, CopyIcon, PolkadotIcon, QrIcon } from "@talismn/icons"
import { getAccountGenesisHash, isAccountLedgerPolkadotGeneric } from "extension-core"
import { log } from "extension-shared"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useBalancesFiatTotalPerNetwork } from "@ui/hooks/useBalancesFiatTotalPerNetwork"
import {
  useAccountByAddress,
  useBalancesByAddress,
  useFeatureFlag,
  useNetworks,
  useRemoteConfig,
} from "@ui/state"

import { AccountIcon } from "../Account/AccountIcon"
import { NetworkLogo } from "../Networks/NetworkLogo"
import { CopyAddressExchangeWarning } from "./CopyAddressExchangeWarning"
import {
  ChainFormat,
  CopyAddressFormatPickerDrawer,
  isMigratedFormat,
  MigratedChainFormat,
} from "./CopyAddressFormatPickerDrawer"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

const ChainFormatButton = ({ format }: { format: ChainFormat }) => {
  const { t } = useTranslation()
  const { setChainId, copySpecific } = useCopyAddressWizard()
  const { open: openWarning, isOpen: isWarningOpen, close: closeWarning } = useOpenClose()

  const [migratedFormatPicker, setMigratedFormatPicker] = useState<{
    format: MigratedChainFormat
    mode: "copy" | "qr"
  }>()

  const handleQrClick = useCallback(() => {
    if (isMigratedFormat(format)) setMigratedFormatPicker({ format, mode: "qr" })
    else setChainId(format.chainId)
  }, [format, setChainId])

  const handleCopyClick = useCallback(() => {
    if (format.chainId === null && !isEthereumAddress(format.address)) {
      openWarning()
    } else if (isMigratedFormat(format)) {
      setMigratedFormatPicker({ format, mode: "copy" })
    } else {
      copySpecific(format.address, format.chainId)
    }
  }, [copySpecific, format, openWarning])

  const handleWarningContinueClick = useCallback(() => {
    copySpecific(format.address, format.chainId)
  }, [copySpecific, format.address, format.chainId])

  const handleFormatPickerSelect = useCallback(
    (legacyFormat: boolean) => {
      if (!migratedFormatPicker) return
      const { format, mode } = migratedFormatPicker

      if (mode === "copy")
        copySpecific(
          legacyFormat ? format.oldAddress : format.address,
          format.chainId,
          legacyFormat,
        )
      if (mode === "qr") {
        setChainId(format.chainId, legacyFormat)
      }

      // close drawer
      setMigratedFormatPicker(undefined)
    },
    [copySpecific, migratedFormatPicker, setChainId],
  )

  return (
    <div className="text-body-secondary hover:text-body hover:bg-grey-800 flex h-32 w-full items-center gap-6 px-12">
      {format.chainId ? (
        <NetworkLogo className="shrink-0 text-xl" networkId={format.chainId} />
      ) : (
        <AccountIcon
          className="shrink-0 text-xl"
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
      <CopyAddressFormatPickerDrawer
        format={migratedFormatPicker?.format}
        onDismiss={() => setMigratedFormatPicker(undefined)}
        onSelect={handleFormatPickerSelect}
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
  const chains = useNetworks({ platform: "polkadot", activeOnly: false, includeTestnets: true })
  const { t } = useTranslation()

  const account = useAccountByAddress(address)
  const accountChain = useMemo(() => {
    const genesisHash = getAccountGenesisHash(account)
    return genesisHash && chains.find((c) => genesisHash === c.genesisHash)
  }, [account, chains])

  const balances = useBalancesByAddress(address)
  const balancesPerNetwork = useBalancesFiatTotalPerNetwork(balances)

  const SUBSTRATE_FORMAT: Omit<ChainFormat, "address"> = useMemo(
    () => ({
      key: "substrate",
      chainId: null,
      prefix: null,
      name: `Substrate (${t("Generic")})`,
    }),
    [t],
  )
  const formats: ChainFormat[] = useMemo(() => {
    if (!address || !chains.length) return []

    const sortedChains = chains
      .filter((c) => typeof c.prefix === "number" && c.account !== "secp256k1")
      .filter(
        // if ledger generic account, restrict to compatible chains
        (c) => !isAccountLedgerPolkadotGeneric(account) || c.hasCheckMetadataHash,
      )
      .sort((a, b) => {
        if (a.id === "polkadot") return -1
        if (b.id === "polkadot") return 1

        if (balancesPerNetwork[a.id] || balancesPerNetwork[b.id])
          return (balancesPerNetwork[b.id] ?? 0) - (balancesPerNetwork[a.id] ?? 0)
        return (a.name ?? "").localeCompare(b.name ?? "")
      })

    return [
      { ...SUBSTRATE_FORMAT, address: normalizeAddress(address) },
      ...sortedChains.map<ChainFormat>((chain) => ({
        key: chain.id,
        chainId: chain.id,
        prefix: chain.prefix,
        oldPrefix: chain.oldPrefix,
        name: chain.name ?? "unknown",
        address: encodeAnyAddress(address, { ss58Format: chain.prefix }),
        oldAddress:
          typeof chain.oldPrefix === "number"
            ? encodeAnyAddress(address, { ss58Format: chain.oldPrefix })
            : undefined,
      })),
    ].filter((f) => !accountChain || accountChain.id === f.chainId)
  }, [address, chains, SUBSTRATE_FORMAT, account, balancesPerNetwork, accountChain])

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
          <UnifiedAddressMigrationBanner formats={filteredFormats} />
          <ChainFormatsList formats={filteredFormats} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}

export const UnifiedAddressMigrationBanner: FC<{ formats: ChainFormat[] }> = ({ formats }) => {
  const { t } = useTranslation()
  const allowBanner = useFeatureFlag("UNIFIED_ADDRESS_BANNER")
  const remoteConfig = useRemoteConfig()

  const showBanner = useMemo(
    () => allowBanner && formats.some(isMigratedFormat),
    [allowBanner, formats],
  )

  const handleClick = useCallback(() => {
    try {
      window.open(
        remoteConfig.documentation.unifiedAddressDocsUrl,
        "_blank",
        "nooppener noreferrer",
      )
    } catch (err) {
      log.error("Unable to open unified address docs", { cause: err })
    }
  }, [remoteConfig.documentation.unifiedAddressDocsUrl])

  if (!showBanner) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-body flex w-full items-center gap-4 bg-gradient-to-r from-[#9F7998] to-[#EB5D93] px-12 py-4 text-left text-sm"
    >
      <div className="grow">
        <PolkadotIcon className="mr-2 inline-block shrink-0 align-text-top" />
        {t("Polkadot introduces new address formatting")}
      </div>
      <ArrowUpRightIcon className="text-body shrink-0 text-[2rem]" />
    </button>
  )
}
