import { IdenticonType } from "@core/domains/accounts/types"
import { Address } from "@core/types/base"
import { classNames } from "@talismn/util"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, useCallback, useMemo } from "react"
import styled from "styled-components"

import AccountAvatar from "../Account/Avatar"

const Container = styled.div`
  display: flex;
  gap: 0.8rem;

  .avatar-option {
    border-radius: 50%;
    font-size: 3.2rem;
    padding: 0.3rem;
    width: 3.8rem;
    height: 3.8rem;
    cursor: pointer;
  }

  .avatar-option.selected {
    background: var(--color-primary);
  }
`

type SelectableAvatarProps = {
  type: IdenticonType
  address: Address
  selected: boolean
  onClick: () => void
}

const AvatarOption: FC<SelectableAvatarProps> = ({ address, type, selected, onClick }) => {
  return (
    <button className={classNames("avatar-option", selected && "selected")} onClick={onClick}>
      <AccountAvatar address={address} type={type} />
    </button>
  )
}

type AvatarTypeSelectProps = {
  className?: string
  selectedType: IdenticonType
  onChange: (type: IdenticonType) => void
}

export const AvatarTypeSelect: FC<AvatarTypeSelectProps> = ({
  className,
  selectedType,
  onChange,
}) => {
  const allAccounts = useAccounts()
  const address = useMemo(
    // fallbacks to a demo address picked from https://guide.kusama.network/docs/learn-accounts/#seed-generation
    () => allAccounts?.[0]?.address ?? "5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX",
    [allAccounts]
  )

  const handleSelect = useCallback(
    (type: IdenticonType) => () => {
      onChange(type)
    },
    [onChange]
  )

  return (
    <Container className={className}>
      <AvatarOption
        address={address}
        type="talisman-orb"
        selected={selectedType === "talisman-orb"}
        onClick={handleSelect("talisman-orb")}
      />
      <AvatarOption
        address={address}
        type="polkadot-identicon"
        selected={selectedType === "polkadot-identicon"}
        onClick={handleSelect("polkadot-identicon")}
      />
    </Container>
  )
}
