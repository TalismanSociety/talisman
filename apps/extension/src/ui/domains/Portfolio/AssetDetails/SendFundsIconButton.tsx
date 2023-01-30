import { IconButton } from "@talisman/components/IconButton"
import { PaperPlaneIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import useTokens from "@ui/hooks/useTokens"
import { useCallback } from "react"
import styled from "styled-components"

import { useSelectedAccount } from "../SelectedAccountContext"

const SmallIconButton = styled(IconButton)`
  height: 1.2rem;
  width: 1.2rem;
  font-size: var(--font-size-xsmall);
`

export const SendFundsButton = ({
  symbol,
  networkId,
}: {
  symbol: string
  networkId: string | number
}) => {
  const { account } = useSelectedAccount()
  const tokens = useTokens()

  const token = tokens?.find(
    (t) =>
      t.symbol === symbol &&
      (("evmNetwork" in t && t.evmNetwork?.id === networkId) || t.chain?.id === networkId)
  )

  const handleClick = useCallback(() => {
    if (!token) return
    api.sendFundsOpen({
      from: account?.address,
      tokenId: token.id,
    })
  }, [account?.address, token])

  if (!token) return null

  return (
    <SmallIconButton onClick={handleClick}>
      <PaperPlaneIcon />
    </SmallIconButton>
  )
}
