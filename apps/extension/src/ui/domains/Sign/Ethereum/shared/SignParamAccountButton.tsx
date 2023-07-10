import { isEthereumAddress } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { SignParamButton, SignParamButtonProps } from "./SignParamButton"

type SignParamAccountButtonProps = Pick<SignParamButtonProps, "explorerUrl" | "withIcon"> & {
  address: string
}

export const SignParamAccountButton: FC<SignParamAccountButtonProps> = ({
  address,
  explorerUrl,
  withIcon,
}) => {
  const account = useAccountByAddress(address)
  const isInvalidAddress = useMemo(() => !isEthereumAddress(address), [address])

  return (
    <SignParamButton
      explorerUrl={explorerUrl}
      address={address}
      withIcon={withIcon}
      iconPrefix={
        account ? (
          <AccountIcon
            className="!h-[1.65rem] !text-[1.65rem] !leading-none"
            address={account.address}
          />
        ) : (
          <AccountIcon
            type="polkadot-identicon"
            className="!h-[1.65rem] !text-[1.65rem] !leading-none"
            address={address}
          />
        )
      }
      contentClassName={isInvalidAddress ? "!text-alert-warn" : undefined}
    >
      {account?.name ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{account.name}</span>
          </TooltipTrigger>
          <TooltipContent>{address}</TooltipContent>
        </Tooltip>
      ) : (
        <Address startCharCount={6} endCharCount={4} address={address} />
      )}
    </SignParamButton>
  )
}
