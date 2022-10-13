import { ModalDialog } from "@talisman/components/ModalDialog"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { Mnemonic } from "@ui/domains/Account/Mnemonic"
import { useState } from "react"

const ShouldShowMnemonicDialog = ({
  setShowMnemonic,
  onBackedUp,
}: {
  onBackedUp: () => void
  setShowMnemonic: (arg: boolean) => void
}) => {
  return (
    <ModalDialog title="Don't lose access to your wallet">
      <p className="text-body-secondary text-sm">Have you backed up your recovery phrase?</p>
      <p className="text-body-secondary text-sm">
        Your recovery phrase is used to restore your Talisman accounts if you or forget your
        password, or lose access to your device.
      </p>
      <p className="text-body-secondary text-sm">
        We strongly encourage you to back up your recovery phrase by writing it down and storing it
        in a secure location
      </p>
      <div className="mt-20 flex justify-between">
        <SimpleButton className="mr-4" onClick={onBackedUp}>
          I've already backed up
        </SimpleButton>
        <SimpleButton onClick={() => setShowMnemonic(true)} primary>
          Backup now
        </SimpleButton>
      </div>
    </ModalDialog>
  )
}

const ShowMnemonic = ({ onBackedUp, mnemonic }: { onBackedUp: () => void; mnemonic: string }) => {
  const [hasHovered, setHasHovered] = useState(false)

  return (
    <ModalDialog title="Secret recovery phrase">
      <p className="text-body-secondary text-sm">
        Your secret phrase protects your account. If you share it you may lose your funds.
      </p>

      <p className="text-body-secondary text-sm">
        We strongly encourage you to back up your recovery phrase by writing it down and storing it
        in a secure location.
      </p>

      <Mnemonic mnemonic={mnemonic} onMouseEnter={() => setHasHovered(true)} />

      <div className="mt-20 flex justify-end">
        <SimpleButton
          primary={hasHovered}
          inverted={!hasHovered}
          onClick={onBackedUp}
          disabled={!hasHovered}
        >
          I've backed it up <ArrowRightIcon />
        </SimpleButton>
      </div>
    </ModalDialog>
  )
}

export const BackUpMnemonicDialog = ({
  onBackedUp,
  mnemonic,
}: {
  onBackedUp: () => void
  mnemonic: string
}) => {
  const [showMnemonic, setShowMnemonic] = useState<boolean>(false)

  if (!showMnemonic)
    return <ShouldShowMnemonicDialog setShowMnemonic={setShowMnemonic} onBackedUp={onBackedUp} />

  return <ShowMnemonic onBackedUp={onBackedUp} mnemonic={mnemonic} />
}
