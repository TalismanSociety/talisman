import { AccountAddressType } from "@core/domains/accounts/types"
import CtaButton from "@talisman/components/CtaButton"
import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"
import { classNames } from "@talismn/util"
import { useEffect, useState } from "react"
import styled from "styled-components"

const Container = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 2rem;
`

const AccountTypeButton = styled(CtaButton)`
  flex-grow: 1;
  > span.icon {
    width: 3.2rem;
    font-size: 3.2rem;
    margin: 0 1.2rem;
  }
  > span.arrow {
    display: none;
  }
  :hover {
    background: var(--color-background-muted-3x);
  }

  &.selected {
    outline: 1px solid var(--color-foreground-muted);
    cursor: default;
  }
`

type AccountTypeSelectorProps = {
  defaultType?: AccountAddressType
  onChange: (type: AccountAddressType) => void
  className?: string
}

const DEFAULT_ADDRESS_TYPES: AccountAddressType[] = ["sr25519", "ethereum"]

export const AccountTypeSelector = ({
  defaultType,
  onChange,
  className,
}: AccountTypeSelectorProps) => {
  const [type, setType] = useState<AccountAddressType | undefined>(defaultType)

  const handleClick = (type: AccountAddressType) => () => {
    setType(type)
  }

  useEffect(() => {
    if (onChange && type) onChange(type)
  }, [onChange, type])

  return (
    <Container className={className} tabIndex={0}>
      <AccountTypeButton
        title="Polkadot"
        className={classNames("allow-focus", type === "sr25519" && "selected")}
        icon={<PolkadotCircleLogo />}
        subtitle="Polkadot, Kusama &amp; Parachains"
        onClick={handleClick("sr25519")}
      />
      <AccountTypeButton
        title="Ethereum"
        className={classNames("allow-focus", type === "ethereum" && "selected")}
        icon={<EthereumCircleLogo />}
        subtitle="Moonbeam, Moonriver, Astar etc."
        onClick={handleClick("ethereum")}
      />
    </Container>
  )
}
