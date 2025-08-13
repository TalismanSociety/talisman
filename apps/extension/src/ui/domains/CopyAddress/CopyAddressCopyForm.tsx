import { Address as TAddress } from "@talismn/balances"
import { getNetworkGenesisHash } from "@talismn/chaindata-provider"
import { getAccountPlatformFromAddress, isAddressEqual } from "@talismn/crypto"
import { AlertCircleIcon, CopyIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { getAccountGenesisHash } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useAccountByAddress, useAccounts, useNetworkById } from "@ui/state"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"
import { NetworkLogo } from "../Networks/NetworkLogo"
import { CopyAddressExchangeWarning } from "./CopyAddressExchangeWarning"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { TextQrCode } from "./TextQrCode"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

const QR_IMAGE_OPTIONS = {
  imageSize: 0.3,
  margin: 5,
}

type AddressPillButtonProps = {
  address?: string | null
  genesisHash?: `0x${string}` | null
  className?: string
  onClick?: () => void
}

const AddressPillButton: FC<AddressPillButtonProps> = ({
  address,
  genesisHash,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)

  const [name, accountGenesisHash] = useMemo(() => {
    if (account) return [account.name, getAccountGenesisHash(account)]
    return [undefined, undefined]
  }, [account])

  const formattedAddress = useFormattedAddress(
    address ?? undefined,
    accountGenesisHash ?? genesisHash,
  )

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-[240px] !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <AccountIcon className="!text-lg" address={address} genesisHash={accountGenesisHash} />
        <div className="leading-base grow truncate">
          {name ?? <Address address={formattedAddress} startCharCount={6} endCharCount={6} />}
        </div>
        <AccountTypeIcon type={account?.type} className="text-primary" />
      </div>
    </PillButton>
  )
}

type NetworkPillButtonProps = {
  chainId?: string | null
  address: TAddress
  className?: string
  onClick?: () => void
}

const NetworkPillButton: FC<NetworkPillButtonProps> = ({
  chainId,
  address,
  className,
  onClick,
}) => {
  const chain = useNetworkById(chainId as string)
  const { t } = useTranslation()

  // substrate generic format
  if (chainId === null)
    return (
      <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
        <div className="text-body flex flex-nowrap items-center gap-4 text-base">
          <div className="flex shrink-0 flex-col justify-center">
            <AccountIcon type="polkadot-identicon" className="!text-lg" address={address} />
          </div>
          <div>Substrate ({t("Generic")})</div>
        </div>
      </PillButton>
    )

  if (!chain) return null

  return (
    <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
      <div className="text-body flex flex-nowrap items-center gap-4 text-base">
        <div className="shrink-0">
          <NetworkLogo className="!text-lg" networkId={chain.id} />
        </div>
        <div>{chain.name}</div>
      </div>
    </PillButton>
  )
}

const ExternalAddressWarning = () => {
  const { t } = useTranslation()
  const { address } = useCopyAddressWizard()

  const accounts = useAccounts("owned")

  const showWarning = useMemo(() => {
    if (!address || !accounts) return false
    return !accounts.some((account) => isAddressEqual(account.address, address))
  }, [accounts, address])

  if (!showWarning) return null

  return (
    <div className="text-alert-warn mb-6 flex items-center justify-center gap-4 text-xs">
      <AlertCircleIcon />
      <div>{t("This address is an external account")}</div>
    </div>
  )
}

const CopyButton = () => {
  const { networkId, copy } = useCopyAddressWizard()
  const { isOpen, open, close } = useOpenClose()

  const handleCopyClick = useCallback(() => {
    // generic substrate format, show exchange warning
    if (networkId === null) open()
    else copy()
  }, [networkId, copy, open])

  const handleContinueClick = useCallback(() => {
    copy()
    close()
  }, [close, copy])

  const { t } = useTranslation()

  return (
    <>
      <ExternalAddressWarning />
      <Button fullWidth primary icon={CopyIcon} onClick={handleCopyClick}>
        {t("Copy Address")}
      </Button>
      <CopyAddressExchangeWarning
        isOpen={isOpen}
        onDismiss={close}
        onContinue={handleContinueClick}
      />
    </>
  )
}

export const CopyAddressCopyForm = () => {
  const {
    networkId,
    formattedAddress,
    logo,
    network,
    isLogoLoaded,
    legacyFormat,
    goToAddressPage,
    goToNetworkPage,
  } = useCopyAddressWizard()

  const platform = useMemo(() => {
    return formattedAddress ? getAccountPlatformFromAddress(formattedAddress) : null
  }, [formattedAddress])

  const isMigratedChain = useMemo(() => {
    if (network?.platform !== "polkadot") return false
    const { oldPrefix, prefix } = network
    return typeof oldPrefix === "number" && oldPrefix !== prefix
  }, [network])

  const { t } = useTranslation()

  if (!formattedAddress) return null

  return (
    <CopyAddressLayout title={t("Copy address")}>
      <div className="flex h-full w-full flex-col items-center px-12 pb-12">
        <div className="bg-grey-900 flex w-full flex-col gap-4 rounded px-8 py-4">
          <div className="text-body-secondary flex h-16 w-full items-center justify-between">
            <div>{t("Account")}</div>
            <div>
              <AddressPillButton
                address={formattedAddress}
                genesisHash={getNetworkGenesisHash(network)}
                onClick={goToAddressPage}
              />
            </div>
          </div>
          {networkId !== undefined && (
            <div className="text-body-secondary flex h-16 w-full items-center justify-between">
              <div>{t("Network")}</div>
              <div>
                <NetworkPillButton
                  chainId={networkId}
                  onClick={goToNetworkPage}
                  address={formattedAddress}
                />
              </div>
            </div>
          )}
          {isMigratedChain && (
            <div className="text-body-secondary flex h-16 w-full items-center justify-between">
              <div>{t("Format")}</div>
              <div>
                <FormatIndicator legacyFormat={legacyFormat} />
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full grow flex-col items-center justify-center gap-12">
          <div className="h-[21rem] w-[21rem] rounded-lg bg-[#ffffff] p-8">
            {isLogoLoaded && (
              <FadeIn>
                <TextQrCode data={formattedAddress} image={logo} imageOptions={QR_IMAGE_OPTIONS} />
              </FadeIn>
            )}
          </div>
          {platform === "polkadot" && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                <Trans
                  t={t}
                  defaults="Your <Highlight>{{name}} <Tooltip /></Highlight> address"
                  values={{ name: network ? network.name : `Substrate (${t("Generic")})` }}
                  components={{
                    Highlight: <span className="text-body" />,
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="hover:text-body inline align-middle text-xs" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {network
                            ? t(
                                "Only use this address for receiving assets on the {{name}} network.",
                                {
                                  name: network.name,
                                },
                              )
                            : t("This address is not specific to a network. Use at your own risk.")}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                {network ? (
                  <NetworkLogo className="text-lg" networkId={network.id} />
                ) : (
                  <AccountIcon
                    type="polkadot-identicon"
                    className="!text-lg [&>div]:block"
                    address={formattedAddress}
                  />
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <div className="leading-none">{shortenAddress(formattedAddress, 5, 5)}</div>
                  </TooltipTrigger>
                  <TooltipContent>{formattedAddress}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
          {platform === "ethereum" && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                <Trans
                  t={t}
                  defaults="Your Ethereum <Tooltip /> address"
                  components={{
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="hover:text-body inline align-middle text-xs" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Use this address for receiving assets on Ethereum and EVM compatible networks",
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <NetworkLogo className="text-lg" networkId="1" />
                <Tooltip>
                  <TooltipTrigger>
                    <div className="leading-none">{shortenAddress(formattedAddress, 5, 5)}</div>
                  </TooltipTrigger>
                  <TooltipContent>{formattedAddress}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
          {platform === "solana" && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                <Trans
                  t={t}
                  defaults="Your Solana <Tooltip /> address"
                  components={{
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="hover:text-body inline align-middle text-xs" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Use this address for receiving assets on Solana and compatible networks",
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <NetworkLogo className="text-lg" networkId="solana-mainnet" />
                <Tooltip>
                  <TooltipTrigger>
                    <div className="leading-none">{shortenAddress(formattedAddress, 5, 5)}</div>
                  </TooltipTrigger>
                  <TooltipContent>{formattedAddress}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        <CopyButton />
      </div>
    </CopyAddressLayout>
  )
}

const FormatIndicator: FC<{ legacyFormat?: boolean }> = ({ legacyFormat }) => {
  const { t } = useTranslation()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-body flex items-center gap-2">
          <span>{legacyFormat ? t("Legacy format") : t("New format")}</span>
          <InfoIcon />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {t("You may need to use legacy format when sending from some exchanges.")}
      </TooltipContent>
    </Tooltip>
  )
}
