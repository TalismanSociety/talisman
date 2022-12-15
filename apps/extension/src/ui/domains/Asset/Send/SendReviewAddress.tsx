import { WithTooltip } from "@talisman/components/Tooltip"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import useChain from "@ui/hooks/useChain"
import { FC } from "react"
import styled from "styled-components"

import { usePrefixAddress } from "../../../hooks/usePrefixAddress"

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
      <FormattedAddress address={address} />
    </Container>
  )
}
