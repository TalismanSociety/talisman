import { CopyIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback } from "react"

import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"

import { useCopyAddressModal } from "../CopyAddress"
import { AccountIcon, AccountIconProps } from "./AccountIcon"

export const AccountIconCopyAddressButton: FC<AccountIconProps> = ({
  address,
  genesisHash,
  className,
  type,
}) => {
  const chain = useChainByGenesisHash(genesisHash)
  const { open } = useCopyAddressModal()

  const handleAvatarClick = useCallback(() => {
    open({
      address,
      networkId: chain?.id,
    })
  }, [address, chain?.id, open])

  return (
    <button
      type="button"
      onClick={handleAvatarClick}
      className={classNames("group size-[1em] shrink-0 rounded-full", className)}
    >
      <AccountIcon type={type} address={address} genesisHash={genesisHash} />
      <div className="absolute  left-0 top-0  flex size-full items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyIcon className="text-[0.5em]" />
      </div>
    </button>
  )
}
