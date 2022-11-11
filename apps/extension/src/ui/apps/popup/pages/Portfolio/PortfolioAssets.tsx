import { Balances } from "@core/domains/balances/types"
import { Box } from "@talisman/components/Box"
import { IconButton } from "@talisman/components/IconButton"
import PopNav from "@talisman/components/PopNav"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ChevronLeftIcon, CopyIcon, IconMore, PaperPlaneIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useAccountExportModal } from "@ui/domains/Account/AccountExportModal"
import { useAccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"
import { useAccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { useAddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import React, { useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

const IconBox = styled(Box)`
  .account-avatar {
    font-size: 3.6rem;
  }
`

// memoise to re-render only if balances object changes
const PageContent = React.memo(({ balances }: { balances: Balances }) => {
  const balancesToDisplay = useDisplayBalances(balances)
  const { account } = useSelectedAccount()
  const { canExportAccount, open: openExportAccountModal } = useAccountExportModal()
  const { canRemove, open: openAccountRemoveModal } = useAccountRemoveModal()
  const { canRename, open: openAccountRenameModal } = useAccountRenameModal()
  const { open: openAddressFormatterModal } = useAddressFormatterModal()
  const { genericEvent } = useAnalytics()

  const sendFunds = useCallback(() => {
    api.modalOpen({ modalType: "send", from: account?.address })
    genericEvent("open send funds", { from: "popup portfolio" })
  }, [account?.address, genericEvent])

  const copyAddress = useCallback(() => {
    if (!account) return
    openAddressFormatterModal(account.address)
    genericEvent("open copy address", { from: "popup portfolio" })
  }, [account, genericEvent, openAddressFormatterModal])

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
          <IconBox fontsizecustom="3.6rem" flex column justify="center">
            <CurrentAccountAvatar />
          </IconBox>
          <Box grow flex column gap={0.4} padding="0 0 0 0.4rem" fontsize="small" overflow="hidden">
            <Box fg="mid" overflow="hidden" textOverflow="ellipsis" noWrap>
              {account ? account.name ?? "Unnamed Account" : "All Accounts"}
            </Box>
            <Box fontsize="medium" overflow="hidden" textOverflow="ellipsis" noWrap>
              <Fiat amount={balances.sum.fiat("usd").total} isBalance />
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
                  <PopNav.Item onClick={openExportAccountModal}>Export Private Key</PopNav.Item>
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
        <PopupAssetsTable balances={balancesToDisplay} />
      </Box>
    </>
  )
})

export const PortfolioAssets = () => {
  const { networkBalances } = usePortfolio()
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("ortfolio assets")
  }, [popupOpenEvent])

  return <PageContent balances={networkBalances} />
}
