import { Balances } from "@core/types"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { WithTooltip } from "@talisman/components/Tooltip"
import { IconMore, PaperPlaneIcon } from "@talisman/theme/icons"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import { AssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useAccountExport } from "@ui/hooks/useAccountExport"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import React, { useCallback, useMemo } from "react"
import styled from "styled-components"
import { useSelectedAccount } from "../../context"
import Layout from "../../layout"

const Stats = styled(Statistics)`
  max-width: 40%;
`
// memoise to re-render only if balances object changes
const PageContent = React.memo(({ balances }: { balances: Balances }) => {
  const balancesToDisplay = useDisplayBalances(balances)
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

  const { portfolio, available, locked } = useMemo(() => {
    const { total, frozen, reserved, transferable } = balancesToDisplay.sum.fiat("usd")
    return {
      portfolio: total,
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balancesToDisplay.sum])

  const copyAddress = useCallback(() => {
    if (!account) return
    openAddressFormatterModal(account.address)
  }, [account, openAddressFormatterModal])

  return (
    <Layout centered large>
      {!!balancesToDisplay.sorted.length && (
        <>
          <Box flex fullwidth gap={1.6}>
            <Stats title="Total Asset Value" fiat={portfolio} />
            <Stats title="Locked" fiat={locked} locked />
            <Stats title="Available" fiat={available} />
            <Box grow flex justify="flex-end" align="center" gap={1.6}>
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
            </Box>
          </Box>
          <Box margin="3.8rem 0 0 0">
            <AssetsTable balances={balancesToDisplay} />
          </Box>
        </>
      )}
    </Layout>
  )
})

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
