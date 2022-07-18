import { Box } from "@talisman/components/Box"
import { FadeIn } from "@talisman/components/FadeIn"
import { IconButton } from "@talisman/components/IconButton"
import { AllAccountsIcon, ChevronRightIcon, CopyIcon, LoaderIcon } from "@talisman/theme/icons"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import { MouseEventHandler, memo, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

import { TotalFiatBalance } from "../../components/TotalFiatBalance"

type AccountOption = {
  address?: string
  name: string
  total?: number
}

const Button = styled.article`
  background-color: var(--color-background-muted);
  outline: none;
  border: none;
  display: flex;
  align-items: center;
  width: 100%;
  padding: 1.1rem 1.2rem;
  border-radius: var(--border-radius-tiny);
  cursor: pointer;
  gap: 1.2rem;
  overflow: hidden;

  &:hover {
    background-color: var(--color-background-muted-3x);
  }
`

const CopyButton = styled(IconButton)`
  font-size: 1.4rem;
  line-height: 1.4rem;
  height: 1.4rem;
  width: 1.4rem;
`

const AccountButton = ({ address, name, total }: AccountOption) => {
  const { open } = useAddressFormatterModal()
  const { select } = useSelectedAccount()
  const navigate = useNavigate()

  const handleAccountClick = useCallback(() => {
    select(address)
    navigate("/portfolio/assets")
  }, [address, navigate, select])

  const handleCopyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      if (address) open(address)
    },
    [address, open]
  )

  return (
    <Button onClick={handleAccountClick}>
      <Box flex column justify="center" fontsize="xlarge">
        {address ? <AccountAvatar address={address} /> : <AllAccountsIcon />}
      </Box>
      <Box flex column justify="center" align="flex-start" grow gap={0.4} overflow="hidden">
        <Box
          flex
          fg="foreground"
          fontsize="normal"
          lineheight="normal"
          fullwidth
          align="start"
          gap={0.6}
        >
          <Box overflow="hidden" textOverflow="ellipsis" noWrap>
            {name}
          </Box>
          {address ? (
            <Box overflow="hidden" height="1.4rem">
              <CopyButton onClick={handleCopyClick}>
                <CopyIcon />
              </CopyButton>
            </Box>
          ) : null}
        </Box>
        <Box
          fg="mid"
          fontsize="small"
          lineheight="small"
          fullwidth
          textalign="left"
          flex
          overflow="hidden"
          textOverflow="ellipsis"
          noWrap
        >
          <Fiat amount={total} isBalance />
        </Box>
      </Box>
      <Box flex column justify="center" fg="foreground" fontsize="large">
        <ChevronRightIcon className="chevron" />
      </Box>
    </Button>
  )
}

const Accounts = memo(({ options }: { options: AccountOption[] }) => (
  <Box flex column fullwidth>
    <TotalFiatBalance />
    <Box flex column fullwidth gap={0.8} padding="2.4rem 0">
      {options.map((option) => (
        <AccountButton key={option.address ?? "all"} {...option} />
      ))}
    </Box>
  </Box>
))

export const PortfolioAccounts = () => {
  const balances = useBalances()
  const accounts = useAccounts()

  const options: AccountOption[] = useMemo(() => {
    return [
      {
        name: "All Accounts",
        total: balances.sum.fiat("usd").total,
      },
      ...accounts.map(({ address, name }) => ({
        address,
        name: name ?? "Unknown Account",
        total: balances.find({ address }).sum.fiat("usd").total,
      })),
    ]
  }, [accounts, balances])

  // if only 1 entry (all accounts) it means that accounts aren't loaded
  if (options.length <= 1) return null

  return (
    <FadeIn>
      <Accounts options={options} />
    </FadeIn>
  )
}
