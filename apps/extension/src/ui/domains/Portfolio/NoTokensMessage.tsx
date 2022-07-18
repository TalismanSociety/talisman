import { Box } from "@talisman/components/Box"
import { CopyIcon, CreditCardIcon } from "@talisman/theme/icons"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useCallback } from "react"
import styled from "styled-components"

import { useAddressFormatterModal } from "../Account/AddressFormatterModal"

const PillButton = styled.button`
  background: rgba(var(--color-mid-raw), 0.15);
  border-radius: var(--border-radius);
  color: var(--color-mid);
  :hover {
    color: var(--color-foreground);
    background: var(--color-background-muted-2x);
  }
  display: flex;
  padding: 0.8rem 1.6rem;
  border: none;
  outline: none;
  cursor: pointer;
  align-items: center;
  gap: 0.8rem;
  svg {
    width: 1.4rem;
    height: 1.4rem;
    transition: none;
  }
`

type NoTokensMessageProps = {
  symbol: string
}

export const NoTokensMessage = ({ symbol }: NoTokensMessageProps) => {
  const { account } = useSelectedAccount()
  const { open } = useAddressFormatterModal()

  const handleCopy = useCallback(() => {
    if (!account?.address) return
    open(account.address)
  }, [account, open])

  const handleBuyClick = useCallback(() => {
    window.open("https://app.talisman.xyz", "_blank")
  }, [])

  return (
    <Box
      fg="mid"
      h={19.2}
      bg="background-muted-3x"
      borderradius
      flex
      column
      align="center"
      justify="center"
      fontsize="normal"
    >
      <Box>
        <Box>
          You don't have any {symbol} {account ? "in this account" : "in Talisman"}
        </Box>
        <Box h={2.4} />
        <Box flex justify="center" gap={0.8}>
          {account && (
            <PillButton onClick={handleCopy}>
              Copy address <CopyIcon />
            </PillButton>
          )}
        </Box>
      </Box>
    </Box>
  )
}
