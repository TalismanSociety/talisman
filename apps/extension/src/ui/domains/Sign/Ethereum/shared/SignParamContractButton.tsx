import { CustomEvmNetwork, EvmAddress, EvmNetwork } from "@extension/core"
import { isEthereumAddress } from "@talismn/util"
import { Address } from "@ui/domains/Account/Address"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SignParamButton } from "./SignParamButton"

type SignParamNetworkAddressButtonProps = {
  address: string
  network: EvmNetwork | CustomEvmNetwork
  className?: string
  name?: string
}

export const SignParamNetworkAddressButton: FC<SignParamNetworkAddressButtonProps> = ({
  address,
  network,
  name,
  className,
}) => {
  const nativeToken = useToken(network.nativeToken?.id)
  const isInvalidAddress = useMemo(() => address.toLowerCase().startsWith("javascript:"), [address])
  const erc20Token = useErc20Token(network.id, address as EvmAddress)

  return (
    <SignParamButton
      explorerUrl={isInvalidAddress ? undefined : network.explorerUrl}
      address={address}
      iconPrefix={<AssetLogo id={erc20Token?.id ?? nativeToken?.id} />}
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
