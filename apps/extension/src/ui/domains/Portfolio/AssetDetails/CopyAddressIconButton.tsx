import { isEthereumAddress } from "@polkadot/util-crypto"
import { IconButton } from "@talisman/components/IconButton"
import { CopyIcon } from "@talisman/theme/icons"
import { encodeAnyAddress } from "@talismn/util"
import { copyAddress } from "@ui/util/copyAddress"
import { useCallback, useMemo } from "react"
import styled from "styled-components"

import { useSelectedAccount } from "../SelectedAccountContext"

const SmallIconButton = styled(IconButton)`
  height: 1.2rem;
  width: 1.2rem;
  font-size: var(--font-size-xsmall);
`

export const CopyAddressButton = ({ prefix }: { prefix: number | null | undefined }) => {
  const { account } = useSelectedAccount()

  const address = useMemo(() => {
    if (!account) return null
    if (isEthereumAddress(account.address)) return account.address
    return encodeAnyAddress(account.address, prefix ?? undefined)
  }, [account, prefix])

  const handleClick = useCallback(() => {
    if (!address) return
    copyAddress(address)
  }, [address])

  if (!address) return null

  return (
    <SmallIconButton onClick={handleClick}>
      <CopyIcon />
    </SmallIconButton>
  )
}
