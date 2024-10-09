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
      className={classNames(
        "size-[1em] shrink-0 rounded-full",
        "[&:hover>.copy-overlay]:opacity-100 [&>.copy-overlay]:opacity-0",
        className
      )}
    >
      <AccountIcon type={type} address={address} genesisHash={genesisHash} />
      <div className="copy-overlay absolute left-0 top-0  flex size-full items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity">
        <CopyIcon className="text-[0.5em]" />
      </div>
    </button>
  )
}
