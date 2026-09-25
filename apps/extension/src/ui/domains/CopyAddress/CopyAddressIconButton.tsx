import { CopyIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { copyAddress } from "@ui/util/copyAddress"
import type { FC } from "react"

export const CopyAddressIconButton: FC<{ address: string; className?: string }> = ({
  address,
  className,
}) => (
  <IconButton className={className} onClick={() => copyAddress(address)} disabled={!address}>
    <CopyIcon />
  </IconButton>
)
