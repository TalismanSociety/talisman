import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, CopyIcon, InfoIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address as TAddress } from "@talismn/balances"
import { classNames, encodeAnyAddress } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import { useContact } from "@ui/hooks/useContact"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { Button, PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"
import { ChainLogo } from "../Asset/ChainLogo"
import { TokenLogo } from "../Asset/TokenLogo"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { TextQrCode } from "./TextQrCode"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

const QR_IMAGE_OPTIONS = {
  imageSize: 0.3,
  margin: 5,
}

type AddressPillButtonProps = { address?: string | null; className?: string; onClick?: () => void }

const AddressPillButton: FC<AddressPillButtonProps> = ({ address, className, onClick }) => {
  const account = useAccountByAddress(address as string)
  const contact = useContact(address)

  const { name, genesisHash } = useMemo(() => {
    if (account) return account
    if (contact) return { name: contact.name, genesisHash: undefined }
    return { name: undefined, genesisHash: undefined }
  }, [account, contact])

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-[240px] !px-4", className)} onClick={onClick}>
      <div className="text-body flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base">
        <AccountIcon className="!text-lg" address={address} genesisHash={genesisHash} />
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {name ?? <Address address={address} startCharCount={6} endCharCount={6} />}
        </div>
        <AccountTypeIcon origin={account?.origin} className="text-primary" />
      </div>
    </PillButton>
  )
}

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
  const token = useToken(tokenId as string)
  const evmNetwork = useEvmNetwork((isEvmToken(token) && token?.evmNetwork?.id) || undefined)
  const chain = useChain((isSubToken(token) && token?.chain?.id) || undefined)

  if (!tokenId || !token) return null

  return (
    <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="relative h-12 w-12 shrink-0">
          <TokenLogo className="!text-lg" tokenId={tokenId} />
          <ChainLogo
            className="border-grey-900 !absolute right-[-2px] top-[-2px] h-6 w-6 rounded-full border-[0.5px]"
            id={evmNetwork?.id ?? chain?.id ?? undefined}
          />
        </div>
        <div>{token.symbol}</div>
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
  const chain = useChain(chainId as string)
  const { t } = useTranslation()

  // substrate generic format
  if (chainId === null)
    return (
      <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
        <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
          <div className="flex shrink-0 flex-col justify-center">
            <AccountIcon type="polkadot-identicon" className="!text-lg" address={address} />
          </div>
          <div>{t("Substrate (Generic)")}</div>
        </div>
      </PillButton>
    )

  if (!chain) return null

  return (
    <PillButton className={classNames("h-16 !px-4 !py-2", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="shrink-0">
          <ChainLogo className="!text-lg" id={chain.id} />
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
    const encoded = encodeAnyAddress(address)
    return !accounts.some((account) => encodeAnyAddress(account.address) === encoded)
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
  const { chainId, copy } = useCopyAddressWizard()
  const { isOpen, open, close } = useOpenClose()

  const handleCopyClick = useCallback(() => {
    // generic substrate format, show exchange warning
    if (chainId === null) open()
    else copy()
  }, [chainId, copy, open])

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
      <Drawer containerId="copy-address-modal" isOpen={isOpen} anchor="bottom" onDismiss={close}>
        <div className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12">
          <AlertCircleIcon className="text-primary-500 text-3xl" />
          <div className="text-md mt-12 font-bold">{t("Sending from an exchange?")}</div>
          <p className="text-body-secondary mt-8 text-center">
            {t("Generic substrate addresses are often incompatible with exchanges.")}
            <br />
            <Trans
              t={t}
              defaults="Talisman recommends you use a <Highlight>network specific address</Highlight>. Always check with your exchange before sending funds."
              components={{
                Highlight: <span className="text-body" />,
              }}
            />
          </p>
          <Button className="mt-12" primary fullWidth onClick={handleContinueClick}>
            {t("Continue")}
          </Button>
        </div>
      </Drawer>
    </>
  )
}

export const CopyAddressCopyForm = () => {
  const {
    mode,
    chainId,
    tokenId,
    formattedAddress,
    logo,
    chain,
    isLogoLoaded,
    goToAddressPage,
    goToNetworkOrTokenPage,
  } = useCopyAddressWizard()

  const isEthereum = useMemo(
    () => !chain && formattedAddress && isEthereumAddress(formattedAddress),
    [chain, formattedAddress]
  )

  const { t } = useTranslation()

  if (!formattedAddress) return null

  return (
    <CopyAddressLayout title={mode === "receive" ? t("Receive funds") : t("Copy address")}>
      <div className="flex h-full w-full flex-col items-center px-12 pb-12">
        <div className="bg-grey-900 flex w-full flex-col gap-4 rounded px-8 py-4">
          {mode === "receive" && (
            <>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>{t("Token")}</div>
                <div>
                  <TokenPillButton tokenId={tokenId} onClick={goToNetworkOrTokenPage} />
                </div>
              </div>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>{t("Account")}</div>
                <div>
                  <AddressPillButton address={formattedAddress} onClick={goToAddressPage} />
                </div>
              </div>
            </>
          )}
          {mode === "copy" && (
            <>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>{t("Account")}</div>
                <div>
                  <AddressPillButton address={formattedAddress} onClick={goToAddressPage} />
                </div>
              </div>
              {chainId !== undefined && (
                <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                  <div>{t("Network")}</div>
                  <div>
                    <NetworkPillButton
                      chainId={chainId}
                      onClick={goToNetworkOrTokenPage}
                      address={formattedAddress}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex w-full grow flex-col items-center justify-center gap-12">
          <div className="h-[21rem] w-[21rem] rounded-lg bg-[#ffffff] p-8 ">
            {isLogoLoaded && (
              <FadeIn>
                <TextQrCode data={formattedAddress} image={logo} imageOptions={QR_IMAGE_OPTIONS} />
              </FadeIn>
            )}
          </div>
          {chain && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                <Trans
                  t={t}
                  defaults="Your <Highlight>{{name}} <Tooltip /></Highlight> address"
                  values={{ name: chain.name }}
                  components={{
                    Highlight: <span className="text-body" />,
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="hover:text-body inline align-middle text-xs" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t(
                            "Only use this address for receiving assets on the {{name}} network.",
                            {
                              name: chain.name,
                            }
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <ChainLogo className="text-lg" id={chain?.id} />
                <Tooltip>
                  <TooltipTrigger>
                    <div className="leading-none">{shortenAddress(formattedAddress, 5, 5)}</div>
                  </TooltipTrigger>
                  <TooltipContent>{formattedAddress}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
          {!isEthereum && chainId === null && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                <Trans
                  t={t}
                  defaults="Your <Highlight>{{name}} <Tooltip /></Highlight> address"
                  values={{ name: t("Substrate (Generic)") }}
                  components={{
                    Highlight: <span className="text-body" />,
                    Tooltip: (
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="hover:text-body inline align-middle text-xs" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("This address is not specific to a network. Use at your own risk.")}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <AccountIcon
                  type="polkadot-identicon"
                  className="!text-lg [&>div]:block"
                  address={formattedAddress}
                />
                <Tooltip>
                  <TooltipTrigger>
                    <div className="leading-none">{shortenAddress(formattedAddress, 5, 5)}</div>
                  </TooltipTrigger>
                  <TooltipContent>{formattedAddress}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
          {isEthereum && (
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
                            "Use this address for receiving assets on Ethereum and EVM compatible networks"
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ),
                  }}
                />
              </div>
              <div className="flex items-center gap-4">
                <ChainLogo className="text-lg" id="1" />
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
