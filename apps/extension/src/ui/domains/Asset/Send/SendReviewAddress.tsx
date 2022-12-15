import { FC } from "react"
import { usePrefixAddress } from "../../../hooks/usePrefixAddress"
import useChain from "@ui/hooks/useChain"
import styled from "styled-components"
import Account from "@ui/domains/Account"
import { WithTooltip } from "@talisman/components/Tooltip"

type SendReviewAddressProps = {
  address: string
  chainId?: string
}

const Container = styled(WithTooltip)`
  margin-left: 1.2rem;
  overflow: hidden;

  .name.name {
    font-size: inherit;
    line-height: inherit;
    color: inherit;
  }
`

export const SendReviewAddress: FC<SendReviewAddressProps> = ({ address, chainId }) => {
  const chain = useChain(chainId)
  const { formattedAddress } = usePrefixAddress(address, chain?.prefix ?? null)

  return (
    <Container tooltip={formattedAddress}>
      <Account.Name address={address} withAvatar />
    </Container>
  )
}
