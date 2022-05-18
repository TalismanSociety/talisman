import { InfoIcon } from "@talisman/theme/icons"
import { Address } from "@ui/domains/Account/Address"
import useChain from "@ui/hooks/useChain"
import { FC } from "react"
import styled from "styled-components"
import { usePrefixAddress } from "../../../hooks/usePrefixAddress"

const Container = styled.div`
  &&& {
    margin-top: 2rem;
    display: block;
    color: var(--color-mid);
    font-size: var(--font-size-small);
    line-height: var(--font-size-medium);
    text-align: left;
    svg {
      margin-right: 0.2em;
      vertical-align: text-top;
    }
  }
`

type SendAddressConvertedWarningProps = {
  address: string
  chainId?: string
  review?: boolean
}

const SendAddressConvertInfo: FC<SendAddressConvertedWarningProps> = ({
  address,
  chainId,
  review,
}) => {
  const chain = useChain(chainId)
  const { isConverted, formattedAddress, accountName } = usePrefixAddress(
    address,
    chain?.prefix ?? null
  )

  if (!address || accountName || chain === undefined || !isConverted) return null

  return review ? (
    <Container>
      <InfoIcon />
      Recipient address has been converted from <Address address={address} /> to {chain?.name} chain
      format : <Address address={formattedAddress} />
    </Container>
  ) : (
    <Container>
      <InfoIcon />
      Recipient address will be converted to {chain?.name} chain format :{" "}
      <Address address={formattedAddress} />
    </Container>
  )
}

// use default export to enable lazy loading
export default SendAddressConvertInfo
