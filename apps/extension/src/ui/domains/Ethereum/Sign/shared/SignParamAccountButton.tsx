import { WithTooltip } from "@talisman/components/Tooltip"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { FC } from "react"

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

  return (
    <SignParamButton
      explorerUrl={explorerUrl}
      address={address}
      withIcon={withIcon}
      iconPrefix={
        account ? (
          <AccountAvatar
            className="!h-[1.65rem] !text-[1.65rem] !leading-none"
            address={account.address}
          />
        ) : (
          <AccountAvatar
            type="polkadot-identicon"
            className="!h-[1.65rem] !text-[1.65rem] !leading-none"
            address={address}
          />
        )
      }
    >
      {account?.name ? (
        <WithTooltip
          tooltip={address}
          className="inline-block h-[1.2em] max-w-[16rem] overflow-hidden overflow-ellipsis whitespace-nowrap align-baseline"
        >
          {account.name}
        </WithTooltip>
      ) : (
        <Address startCharCount={6} endCharCount={4} address={address} />
      )}
    </SignParamButton>
  )
}
