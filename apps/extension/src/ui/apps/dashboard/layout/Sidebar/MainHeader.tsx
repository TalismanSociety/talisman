import { CopyIcon, MoreHorizontalIcon, SendIcon } from "@talismn/icons"
import { AccountContextMenu } from "@ui/apps/dashboard/routes/Portfolio/AccountContextMenu"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { AccountSelect } from "@ui/domains/Portfolio/AccountSelect"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { ButtonHTMLAttributes, FC, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  IconButton,
  PillButton,
  PillButtonProps,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

export const MainHeader = () => {
  const { t } = useTranslation()
  const { genericEvent } = useAnalytics()

  const { account, accounts } = useSelectedAccount()

  const { open: openCopyAddressModal } = useCopyAddressModal()
  const handleCopyClick = useCallback(() => {
    openCopyAddressModal({
      address: account?.address, // if account is chain specific, specify the chain ?
    })
    genericEvent("open receive", { from: "sidebar" })
  }, [account, genericEvent, openCopyAddressModal])

  return (
    <header className="p-4 md:px-12 md:pb-6 md:pt-12">
      <AccountSelect />
      {/* Pills for large screens */}
      <div className="hidden flex-col items-center gap-4 p-4 pb-0 md:flex lg:flex-row">
        <SendPillButton className="!px-4" icon={SendIcon}>
          {t("Send")}
        </SendPillButton>
        <PillButton
          className="!px-4"
          icon={CopyIcon}
          onClick={handleCopyClick}
          disabled={accounts.length === 0}
        >
          {t("Copy")}
        </PillButton>
        <div className="hidden flex-grow lg:block" />
        {accounts.length > 0 && (
          <AccountContextMenu
            analyticsFrom="dashboard portfolio"
            placement="bottom-start"
            trigger={
              <PillButton className="!px-4">
                <MoreHorizontalIcon className="shrink-0" />
              </PillButton>
            }
          />
        )}
      </div>
      {/* Buttons for small screens */}
      <div className="flex justify-center py-2 md:hidden">
        <SendIconButton className="hover:bg-grey-800 rounded-xs p-1 !text-base">
          <SendIcon />
        </SendIconButton>
        <IconButton
          className="hover:bg-grey-800 rounded-xs p-1 !text-base"
          onClick={handleCopyClick}
          disabled={accounts.length === 0}
        >
          <CopyIcon />
        </IconButton>
        {accounts.length > 0 && (
          <AccountContextMenu
            analyticsFrom="dashboard portfolio"
            trigger={
              <IconButton className="hover:bg-grey-800 rounded-xs p-1 !text-base">
                <MoreHorizontalIcon />
              </IconButton>
            }
          />
        )}
      </div>
    </header>
  )
}

const SendPillButtonInner: FC<PillButtonProps> = (props) => {
  const { account } = useSelectedAccount()

  // This reads balances to check for transferable funds and triggers suspense
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  return canSendFunds ? (
    <PillButton onClick={openSendFundsPopup} {...props} />
  ) : (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <PillButton disabled {...props} />
      </TooltipTrigger>
      <TooltipContent>{cannotSendFundsReason}</TooltipContent>
    </Tooltip>
  )
}

const SendPillButton: FC<PillButtonProps> = (props) => (
  <Suspense fallback={<PillButton disabled {...props} />}>
    <SendPillButtonInner {...props} />
  </Suspense>
)

type SendIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref">

const SendIconButtonInner: FC<SendIconButtonProps> = (props) => {
  const { account } = useSelectedAccount()

  // This reads balances to check for transferable funds and triggers suspense
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(account)

  return canSendFunds ? (
    <IconButton onClick={openSendFundsPopup} {...props} />
  ) : (
    <Tooltip placement="bottom-start">
      <TooltipTrigger asChild>
        <IconButton disabled {...props} />
      </TooltipTrigger>
      <TooltipContent>{cannotSendFundsReason}</TooltipContent>
    </Tooltip>
  )
}

const SendIconButton: FC<SendIconButtonProps> = (props) => (
  <Suspense fallback={<IconButton disabled {...props} />}>
    <SendIconButtonInner {...props} />
  </Suspense>
)
