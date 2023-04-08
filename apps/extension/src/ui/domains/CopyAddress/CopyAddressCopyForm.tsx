import { stringToU8a } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { FadeIn } from "@talisman/components/FadeIn"
import { WithTooltip } from "@talisman/components/Tooltip"
import { CopyIcon, InfoIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames } from "@talismn/util"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useContact } from "@ui/hooks/useContact"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { FC, useCallback, useMemo } from "react"
import { Button, PillButton } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import { TokenLogo } from "../Asset/TokenLogo"
import { QrCode } from "../Sign/Qr/QrCode"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

const QR_IMAGE_OPTIONS = {
  imageSize: 1,
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

type NetworkPillButtonProps = { chainId?: string | null; className?: string; onClick?: () => void }

const NetworkPillButton: FC<NetworkPillButtonProps> = ({ chainId, className, onClick }) => {
  const chain = useChain(chainId as string)

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

export const CopyAddressCopyForm = () => {
  const {
    chainId,
    tokenId,
    formattedAddress,
    image,
    goToAddressPage,
    chain,
    goToNetworkOrTokenPage,
    copy,
  } = useCopyAddressWizard()

  const isEthereum = useMemo(
    () => !chain && formattedAddress && isEthereumAddress(formattedAddress),
    [chain, formattedAddress]
  )

  const data = useMemo(() => {
    return formattedAddress ? stringToU8a(formattedAddress) : undefined
  }, [formattedAddress])

  if (!formattedAddress) return null

  return (
    <CopyAddressLayout title="Receive funds">
      <div className="flex h-full w-full flex-col items-center px-12 pb-12">
        <div className="bg-grey-900 flex w-full flex-col gap-4 rounded py-4 px-8">
          <div className="text-body-secondary flex h-16 w-full items-center justify-between">
            <div>Account</div>
            <div>
              <AddressPillButton address={formattedAddress} onClick={goToAddressPage} />
            </div>
          </div>
          {!!tokenId && (
            <div className="text-body-secondary flex h-16 w-full items-center justify-between">
              <div>Token</div>
              <div>
                <TokenPillButton tokenId={tokenId} onClick={goToNetworkOrTokenPage} />
              </div>
            </div>
          )}
          {!!chainId && (
            <div className="text-body-secondary flex h-16 w-full items-center justify-between">
              <div>Network</div>
              <div>
                <NetworkPillButton chainId={chainId} onClick={goToNetworkOrTokenPage} />
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full grow flex-col items-center justify-center gap-12">
          <div className="h-[24rem] w-[24rem] rounded-lg bg-white p-10 ">
            <FadeIn>
              <QrCode data={data} image={image} imageOptions={QR_IMAGE_OPTIONS} />
            </FadeIn>
          </div>
          {chain && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                Your <span className="text-body">{chain.name}</span>{" "}
                <WithTooltip
                  tooltip={`Only use this address for receiving assets on the ${chain.name} ${
                    chain.relay?.id === chain.id ? "Relay Chain" : "network"
                  }`}
                >
                  <InfoIcon className="hover:text-body inline align-middle  text-xs" />
                </WithTooltip>{" "}
                address
              </div>
              <div className="flex items-center gap-4">
                <ChainLogo className="text-lg" id={chain?.id} />
                <div>{shortenAddress(formattedAddress, 5, 5)}</div>
              </div>
            </div>
          )}
          {isEthereum && (
            <div className="text-body-secondary leading-paragraph flex flex-col items-center gap-1 text-center">
              <div>
                Your Ethereum{" "}
                <WithTooltip
                  tooltip={`Use this address for receiving assets on Ethereum and EVM compatible networks`}
                >
                  <InfoIcon className="hover:text-body inline align-middle text-xs" />
                </WithTooltip>{" "}
                address
              </div>
              <div className="flex items-center gap-4">
                <ChainLogo className="text-lg" id="1" />
                <div>{shortenAddress(formattedAddress, 5, 5)}</div>
              </div>
            </div>
          )}
        </div>

        <Button fullWidth primary icon={CopyIcon} onClick={copy}>
          Copy Address
        </Button>
      </div>
    </CopyAddressLayout>
  )
}
