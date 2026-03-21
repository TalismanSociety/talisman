import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import type { Address as TAddress } from "@talismn/balances"
import { getNetworkGenesisHash } from "@talismn/chaindata-provider"
import { getAccountPlatformFromAddress, isAddressEqual } from "@talismn/crypto"
import { AlertCircleIcon, CopyIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { FadeIn } from "@ui/components/FadeIn"
import { PillButton } from "@ui/components/PillButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useFormattedAddress } from "@ui/hooks/useFormattedAddress"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

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
    accountGenesisHash ?? genesisHash
  )

  if (!address) return null

  return (
    <PillButton className={classNames("px-4! h-16 max-w-[240px]", className)} onClick={onClick}>
      <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
        <AccountIcon className="text-lg!" address={address} genesisHash={accountGenesisHash} />
        <div className="grow truncate leading-base">
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
      <PillButton className={classNames("px-4! py-2! h-16", className)} onClick={onClick}>
        <div className="flex flex-nowrap items-center gap-4 text-base text-body">
          <div className="flex shrink-0 flex-col justify-center">
            <AccountIcon type="polkadot-identicon" className="text-lg!" address={address} />
          </div>
          <div>Substrate ({t("Generic")})</div>
        </div>
      </PillButton>
    )

  if (!chain) return null

  return (
    <PillButton className={classNames("px-4! py-2! h-16", className)} onClick={onClick}>
      <div className="flex flex-nowrap items-center gap-4 text-base text-body">
        <div className="shrink-0">
          <NetworkLogo className="text-lg!" networkId={chain.id} />
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
    <div className="mb-6 flex items-center justify-center gap-4 text-alert-warn text-xs">
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
        <div className="flex w-full flex-col gap-4 rounded bg-grey-900 px-8 py-4">
          <div className="flex h-16 w-full items-center justify-between text-body-secondary">
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
            <div className="flex h-16 w-full items-center justify-between text-body-secondary">
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
            <div className="flex h-16 w-full items-center justify-between text-body-secondary">
              <div>{t("Format")}</div>
              <div>
                <FormatIndicator legacyFormat={legacyFormat} />
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full grow flex-col items-center justify-center gap-12">
          <div className="h-[13.125rem] w-[13.125rem] rounded-lg bg-[#ffffff] p-8">
            {isLogoLoaded && (
              <FadeIn>
                <TextQrCode data={formattedAddress} image={logo} imageOptions={QR_IMAGE_OPTIONS} />
              </FadeIn>
            )}
          </div>
          {platform === "polkadot" && (
            <div className="flex flex-col items-center gap-1 text-center text-body-secondary leading-paragraph">
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
                          <InfoIcon className="inline align-middle text-xs hover:text-body" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {network
                            ? t(
                                "Only use this address for receiving assets on the {{name}} network.",
                                {
                                  name: network.name,
                                }
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
                    className="text-lg! [&>div]:block"
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
            <div className="flex flex-col items-center gap-1 text-center text-body-secondary leading-paragraph">
              <div>
                <Trans
                  t={t}
                  defaults="Your Ethereum <Tooltip /> address"
                  components={{
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="inline align-middle text-xs hover:text-body" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Use this address for receiving assets on Ethereum and EVM compatible networks"
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
            <div className="flex flex-col items-center gap-1 text-center text-body-secondary leading-paragraph">
              <div>
                <Trans
                  t={t}
                  defaults="Your Solana <Tooltip /> address"
                  components={{
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="inline align-middle text-xs hover:text-body" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Use this address for receiving assets on Solana and compatible networks"
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
        <div className="flex items-center gap-2 text-body">
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
