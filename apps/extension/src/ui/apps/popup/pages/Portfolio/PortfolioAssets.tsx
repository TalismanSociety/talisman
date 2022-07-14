import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { WithTooltip } from "@talisman/components/Tooltip"
import {
  AllAccountsIcon,
  ChevronLeftIcon,
  CopyIcon,
  IconMore,
  PaperPlaneIcon,
} from "@talisman/theme/icons"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { useSendTokensModal } from "@ui/domains/Asset/Send"
import { AccountSelect } from "@ui/domains/Portfolio/AccountSelect"
import { GroupedAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useAccountExport } from "@ui/hooks/useAccountExport"
import { useDisplayBalances } from "@ui/hooks/useDisplayBalances"
import React, { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

const PopupAccountSelect = styled(AccountSelect)`
  > ul {
    max-height: 30rem;
  }
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

  const copyAddress = useCallback(() => {
    if (!account) return
    openAddressFormatterModal(account.address)
  }, [account, openAddressFormatterModal])

  const navigate = useNavigate()
  const handleBackBtnClick = useCallback(() => {
    navigate("/portfolio")
  }, [navigate])

  return (
    <>
      <Box flex fullwidth gap={1.6}>
        <Box flex fullwidth gap={0.8} align="center" overflow="hidden">
          <IconButton onClick={handleBackBtnClick}>
            <ChevronLeftIcon />
          </IconButton>
          <Box fontsizecustom="3.6rem" flex column justify="center">
            {account?.address ? <AccountAvatar address={account.address} /> : <AllAccountsIcon />}
          </Box>
          <Box grow flex column gap={0.4} padding="0 0 0 0.4rem" fontsize="small" overflow="hidden">
            <Box fg="mid" overflow="hidden" textOverflow="ellipsis" noWrap>
              {account ? account.name ?? "Unnamed Account" : "All Accounts"}
            </Box>
            <Box fontsize="medium" overflow="hidden" textOverflow="ellipsis" noWrap>
              <Fiat amount={balances.sum.fiat("usd").total} />
            </Box>
          </Box>
        </Box>
        <Box grow flex justify="flex-end" align="center" gap={0.8}>
          <IconButton onClick={sendFunds}>
            <WithTooltip tooltip="Send">
              <PaperPlaneIcon />
            </WithTooltip>
          </IconButton>
          {account && (
            <>
              <IconButton onClick={copyAddress}>
                <WithTooltip tooltip="Copy address">
                  <CopyIcon />
                </WithTooltip>
              </IconButton>
              <PopNav
                trigger={
                  <IconButton>
                    <WithTooltip tooltip="More options">
                      <IconMore />
                    </WithTooltip>
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
            </>
          )}
        </Box>
      </Box>
      <Box padding="2.4rem 0">
        <GroupedAssetsTable balances={balancesToDisplay} />
      </Box>
    </>
  )
})

export const PortfolioAssets = () => {
  const { balances } = usePortfolio()

  return <PageContent balances={balances} />
}
