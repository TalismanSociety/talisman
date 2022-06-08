import { Balances } from "@core/types"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { WithTooltip } from "@talisman/components/Tooltip"
import { IconMore, LockIcon, PaperPlaneIcon } from "@talisman/theme/icons"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import Fiat from "@ui/domains/Asset/Fiat"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import { AssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useAccountExport } from "@ui/hooks/useAccountExport"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useCallback, useMemo } from "react"
import styled from "styled-components"
import { useSelectedAccount } from "../context"
import Layout from "../layout"

const Header = styled.header`
  display: flex;
  width: 100%;
  gap: 1.6rem;
`

const Flex = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4em;
`

const Buttons = styled.div`
  flex-grow: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.6rem;
`

const Main = styled.section`
  margin-top: 3.8rem;
`

const Stats = styled(Statistics)`
  max-width: 40%;
`

const PageContent = ({ balances }: { balances: Balances }) => {
  const { account } = useSelectedAccount()
  const { canExportAccount, exportAccount } = useAccountExport(account)
  const { canRemove, open: openAccountRemoveModal } = useAccountRemoveModal()
  const { canRename, open: openAccountRenameModal } = useAccountRenameModal()
  const { open: openAddressFormatterModal } = useAddressFormatterModal()
  const { open: openSendFundsModal } = useSendTokensModal()

  const sendFunds = useCallback(
    () => openSendFundsModal({ from: account?.address }),
    [account?.address, openSendFundsModal]
  )

  const { available, locked } = useMemo(() => {
    const { frozen, reserved, transferable } = balances.sum.fiat("usd")
    return {
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balances.sum])

  const copyAddress = useCallback(() => {
    if (!account) return
    openAddressFormatterModal(account.address)
  }, [account, openAddressFormatterModal])

  return (
    <Layout centered large>
      <Header>
        <Stats title="Available">
          <Fiat amount={available} currency="usd" isBalance />
        </Stats>
        <Stats
          title={
            <Flex>
              <LockIcon />
              <span>Locked</span>
            </Flex>
          }
        >
          <Fiat amount={locked} currency="usd" isBalance />
        </Stats>
        <Buttons>
          <WithTooltip tooltip="Send">
            <IconButton onClick={sendFunds}>
              <PaperPlaneIcon />
            </IconButton>
          </WithTooltip>

          {account && (
            <PopNav
              trigger={
                <IconButton>
                  <IconMore />
                </IconButton>
              }
              className="icon more"
              closeOnMouseOut
            >
              <PopNav.Item onClick={copyAddress}>Copy address</PopNav.Item>
              {canRename && <PopNav.Item onClick={openAccountRenameModal}>Rename</PopNav.Item>}
              {canExportAccount && (
                <PopNav.Item onClick={exportAccount}>Export Private Key</PopNav.Item>
              )}
              {canRemove && (
                <PopNav.Item onClick={openAccountRemoveModal}>Remove Account</PopNav.Item>
              )}
            </PopNav>
          )}
        </Buttons>
      </Header>
      <Main>
        <AssetsTable balances={balances} />
      </Main>
    </Layout>
  )
}

const SingleAccountAssetsTable = ({ address }: { address: string }) => {
  const balances = useBalancesByAddress(address)

  return <PageContent balances={balances} />
}

const AllAccountsAssetsTable = () => {
  const balances = useBalances()

  return <PageContent balances={balances} />
}

export const Portfolio = () => {
  const { account } = useSelectedAccount()

  return account ? (
    <SingleAccountAssetsTable address={account.address} />
  ) : (
    <AllAccountsAssetsTable />
  )
}
