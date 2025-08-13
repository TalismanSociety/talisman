import { EthNetwork } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { EvmAddress } from "extension-core"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Address } from "@ui/domains/Account/Address"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import { useToken } from "@ui/state"

import { SignParamButton } from "./SignParamButton"

type SignParamNetworkAddressButtonProps = {
  address: string
  network: EthNetwork
  className?: string
  name?: string
}

export const SignParamNetworkAddressButton: FC<SignParamNetworkAddressButtonProps> = ({
  address,
  network,
  name,
  className,
}) => {
  const nativeToken = useToken(network.nativeTokenId)
  const isInvalidAddress = useMemo(() => address.toLowerCase().startsWith("javascript:"), [address])
  const erc20Token = useErc20Token(network.id, address as EvmAddress)

  return (
    <SignParamButton
      explorerUrl={isInvalidAddress ? undefined : network.blockExplorerUrls[0]}
      address={address}
      iconPrefix={<TokenLogo tokenId={erc20Token?.id ?? nativeToken?.id} />}
      withIcon
      className={className}
      contentClassName={isInvalidAddress ? "text-alert-warn" : undefined}
    >
      {name ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{name}</span>
          </TooltipTrigger>
          <TooltipContent>{address}</TooltipContent>
        </Tooltip>
      ) : // could be a text address. ex: swap DYM on https://portal.dymension.xyz/
      isEthereumAddress(address) ? (
        <Address startCharCount={6} endCharCount={4} address={address} />
      ) : (
        address
      )}
    </SignParamButton>
  )
}
