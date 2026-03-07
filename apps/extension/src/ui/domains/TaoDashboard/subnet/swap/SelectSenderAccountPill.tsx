import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { cn } from "@talismn/util"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { SenderAccountPicker } from "@ui/domains/Earn/shared/SenderAccountPicker"
import { useAccountByAddress } from "@ui/state/accounts"
import { Modal } from "@ui/talisman-ui/components/Modal"
import { WizardModalDialog } from "@ui/talisman-ui/components/WizardModalDialog"
import { type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"

export const SelectSenderAccountPill: FC<{
  address: string | null
  tokenId: string
  onSelect: (address: string) => void
}> = ({ address, tokenId, onSelect }) => {
  const { t } = useTranslation()
  const account = useAccountByAddress(address)

  const { open, isOpen, close } = useOpenClose()

  const handleSelect = useCallback(
    (address: string) => {
      onSelect(address)
      close()
    },
    [onSelect, close]
  )

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex h-14 items-center gap-2 overflow-hidden rounded bg-grey-800 px-4 font-medium text-sm text-white hover:bg-grey-700",
          account && "pl-2"
        )}
        onClick={open}
      >
        {account ? <AccountDisplay address={account.address} /> : t("Select Account")}
      </button>
      <Modal isOpen={isOpen} onDismiss={close}>
        <PopupSizeModalContainer id="select-sender-account-pickermodal">
          <WizardModalDialog
            title={t("Select account")}
            onCloseClick={close}
            className="size-full border-none"
            contentClassName="p-0"
          >
            <SenderAccountPicker address={address} tokenId={tokenId} onSelect={handleSelect} />
          </WizardModalDialog>
        </PopupSizeModalContainer>
      </Modal>
    </>
  )
}
