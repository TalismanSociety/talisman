import { shortenAddress } from "@talisman/util/shortenAddress"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { FC, useMemo } from "react"
import { PillButton, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"

type SendFundsAddressPillButtonProps = {
  address?: string | null
  className?: string
  onClick?: () => void
}

export const SendFundsAddressPillButton: FC<SendFundsAddressPillButtonProps> = ({
  address,
  className,
  onClick,
}) => {
  const account = useAccountByAddress(address as string)

  // TODO lookup contacts

  const { name, genesisHash } = useMemo(
    () => account ?? { name: undefined, genesisHash: undefined },
    [account]
  )

  const text = useMemo(() => name ?? shortenAddress(address ?? "", 6, 6), [address, name])

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 max-w-full !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex max-w-full flex-nowrap items-center gap-4 overflow-hidden text-base">
        <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {text}
        </div>
      </div>
    </PillButton>
  )
}
