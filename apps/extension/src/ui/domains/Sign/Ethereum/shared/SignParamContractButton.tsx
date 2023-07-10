import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { isEthereumAddress } from "@talismn/util"
import { Address } from "@ui/domains/Account/Address"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
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
  const isInvalidAddress = useMemo(() => !isEthereumAddress(address), [address])

  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      iconPrefix={
        <AssetLogo
          id={nativeToken?.id}
          erc20={{ evmNetworkId: network.id, contractAddress: address }}
        />
      }
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
      ) : (
        <Address startCharCount={6} endCharCount={4} address={address} />
      )}
    </SignParamButton>
  )
}
