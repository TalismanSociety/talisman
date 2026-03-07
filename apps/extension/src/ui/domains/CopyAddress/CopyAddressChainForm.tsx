import {
  getAccountGenesisHash,
  isAccountLedgerPolkadotGeneric,
} from "@core/domains/keyring/exports"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { encodeAnyAddress, isEthereumAddress, normalizeAddress } from "@talismn/crypto"
import { CopyIcon, QrIcon } from "@talismn/icons"
import { useBalancesFiatTotalPerNetwork } from "@ui/hooks/useBalancesFiatTotalPerNetwork"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalancesByAddress } from "@ui/state/balances"
import { useNetworks } from "@ui/state/chaindata"
import { IconButton } from "@ui/talisman-ui/components/IconButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountIcon } from "../Account/AccountIcon"
import { NetworkLogo } from "../Networks/NetworkLogo"
import { CopyAddressExchangeWarning } from "./CopyAddressExchangeWarning"
import {
  type ChainFormat,
  CopyAddressFormatPickerDrawer,
  isMigratedFormat,
  type MigratedChainFormat,
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
          legacyFormat
        )
      if (mode === "qr") {
        setChainId(format.chainId, legacyFormat)
      }

      // close drawer
      setMigratedFormatPicker(undefined)
    },
    [copySpecific, migratedFormatPicker, setChainId]
  )

  return (
    <div className="flex h-32 w-full items-center gap-6 px-12 text-body-secondary hover:bg-grey-800 hover:text-body">
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
        <div className="truncate text-body">{format.name}</div>
        <div className="truncate text-body-secondary text-xs">
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
    [t]
  )
  const formats: ChainFormat[] = useMemo(() => {
    if (!address || !chains.length) return []

    const sortedChains = chains
      .filter((c) => typeof c.prefix === "number" && c.account !== "secp256k1")
      .filter(
        // if ledger generic account, restrict to compatible chains
        (c) => !isAccountLedgerPolkadotGeneric(account) || c.hasCheckMetadataHash
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
          <SearchInput onChange={setSearch} placeholder={t("Search by network name")} autoFocus />
        </div>
        <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
          <ChainFormatsList formats={filteredFormats} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
