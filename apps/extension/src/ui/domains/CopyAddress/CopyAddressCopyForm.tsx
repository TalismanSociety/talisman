import { isEthereumAddress } from "@polkadot/util-crypto"
import { Drawer } from "@talisman/components/Drawer"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { AlertCircleIcon, CopyIcon, InfoIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useContact } from "@ui/hooks/useContact"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { FC, useCallback, useMemo } from "react"
import { Button, PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
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
        <div>
          <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        </div>
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {name ?? shortenAddress(address, 6, 6)}
        </div>
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
    <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="relative h-12 w-12 shrink-0">
          <TokenLogo className="!text-lg" tokenId={tokenId} />
          <ChainLogo
            className="border-grey-900 !absolute top-[-2px] right-[-2px] h-6 w-6 rounded-full border-[0.5px]"
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
  address: Address
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

  // substrate generic format
  if (chainId === null)
    return (
      <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
        <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
          <div className="flex shrink-0 flex-col justify-center">
            <AccountAvatar type="polkadot-identicon" className="!text-lg" address={address} />
          </div>
          <div>Substrate (Generic)</div>
        </div>
      </PillButton>
    )

  if (!chain) return null

  return (
    <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div className="shrink-0">
          <ChainLogo className="!text-lg" id={chain.id} />
        </div>
        <div>{chain.name}</div>
      </div>
    </PillButton>
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

  return (
    <>
      <Button fullWidth primary icon={CopyIcon} onClick={handleCopyClick}>
        Copy Address
      </Button>
      <Drawer parent="copy-address-modal" open={isOpen} anchor="bottom" onClose={close}>
        <div className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12">
          <AlertCircleIcon className="text-primary-500 text-3xl" />
          <div className="text-md mt-12 font-bold">Sending from an exchange?</div>
          <p className="text-body-secondary mt-8 text-center">
            Generic substrate addresses are often incompatible with exchanges.
            <br />
            Talisman recommends you use a{" "}
            <span className="text-body">network specific address</span>. Always check with your
            exchange before sending funds.
          </p>
          <Button className="mt-12" primary fullWidth onClick={handleContinueClick}>
            Continue
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

  if (!formattedAddress) return null

  return (
    <CopyAddressLayout title={mode === "receive" ? "Receive funds" : "Copy address"}>
      <div className="flex h-full w-full flex-col items-center px-12 pb-12">
        <div className="bg-grey-900 flex w-full flex-col gap-4 rounded py-4 px-8">
          {mode === "receive" && (
            <>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>Token</div>
                <div>
                  <TokenPillButton tokenId={tokenId} onClick={goToNetworkOrTokenPage} />
                </div>
              </div>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>Account</div>
                <div>
                  <AddressPillButton address={formattedAddress} onClick={goToAddressPage} />
                </div>
              </div>
            </>
          )}
          {mode === "copy" && (
            <>
              <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                <div>Account</div>
                <div>
                  <AddressPillButton address={formattedAddress} onClick={goToAddressPage} />
                </div>
              </div>
              {chainId !== undefined && (
                <div className="text-body-secondary flex h-16 w-full items-center justify-between">
                  <div>Network</div>
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
          <div className="h-[24rem] w-[24rem] rounded-lg bg-[#ffffff] p-10 ">
            {isLogoLoaded && (
              <FadeIn>
                <TextQrCode data={formattedAddress} image={logo} imageOptions={QR_IMAGE_OPTIONS} />
              </FadeIn>
            )}
          </div>
          {chain && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                Your <span className="text-body">{chain.name}</span>{" "}
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="hover:text-body inline align-middle text-xs" />
                  </TooltipTrigger>
                  <TooltipContent>{`Only use this address for receiving assets on the ${
                    chain.name
                  } ${chain.relay?.id === chain.id ? "Relay Chain" : "network"}`}</TooltipContent>
                </Tooltip>{" "}
                address
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
          {chainId === null && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                Your <span className="text-body">Substrate (Generic)</span>{" "}
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="hover:text-body inline align-middle text-xs" />
                  </TooltipTrigger>
                  <TooltipContent>
                    This address is not specific to a network. Use at your own risk.
                  </TooltipContent>
                </Tooltip>{" "}
                address
              </div>
              <div className="flex items-center gap-4">
                <AccountAvatar
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
                Your Ethereum{" "}
                <Tooltip>
                  <TooltipTrigger>
                    <InfoIcon className="hover:text-body inline align-middle text-xs" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Use this address for receiving assets on Ethereum and EVM compatible networks
                  </TooltipContent>
                </Tooltip>{" "}
                address
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
