import Field from "@talisman/components/Field"
import Account from "@ui/domains/Account"
import { FC } from "react"
import styled from "styled-components"

const AuthorisedSitesListAccount: FC<{
  address: string
  isConnected: boolean
  onChange: () => void
  className?: string
}> = ({ address, isConnected, onChange, className }) => {
  return (
    <div className={`${className} authorised-site-account`}>
      <span>
        <Account.Name address={address} withAvatar />
      </span>
      <span>
        <Field.Toggle value={isConnected} onChange={onChange} />
      </span>
    </div>
  )
}

const StyledAuthorisedSitesListAccount = styled(AuthorisedSitesListAccount)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: opacity: 0.15s ease-in-out;

  .account-avatar {
    font-size: var(--font-size-large);
  }

  ${({ isConnected }) =>
    !isConnected &&
    `
    opacity: 0.5;
    filter: saturate(0.3);
  `}
`

export default StyledAuthorisedSitesListAccount
