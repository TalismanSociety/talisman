import { Box } from "@talisman/components/Box"
import { UsbIcon } from "@talisman/theme/icons"
import AccountAvatar from "@ui/domains/Account/Avatar"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import styled from "styled-components"

const Container = styled(Box)`
  .account-avatar {
    font-size: 1em;
  }
`

export const PortfolioAccount = ({
  address,
  className,
}: {
  address: string
  className?: string
}) => {
  const account = useAccountByAddress(address)
  if (!account) return null
  return (
    <Container className={className} flex gap={0.6}>
      <Box>
        <AccountAvatar address={address} />
      </Box>
      <Box overflow="hidden" textOverflow="ellipsis" noWrap>
        {account.name ?? "Unnknown"}
      </Box>
      {!!account?.isHardware && (
        <Box fg="primary">
          <UsbIcon />
        </Box>
      )}
    </Container>
  )
}
