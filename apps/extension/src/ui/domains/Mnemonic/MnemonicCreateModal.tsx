import { mnemonicGenerate } from "@polkadot/util-crypto"
import { provideContext } from "@talisman/util/provideContext"
import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, ModalDialog, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Modal } from "talisman-ui"

import { MnemonicWordCountSwitch } from "./MnemonicWordCountSwitch"

const Description = () => {
  const { t } = useTranslation("admin")
  return (
    <div className="text-body-secondary text-sm">
      <p>
        {t(
          "This recovery phrase can be used to restore your account if you lose access to your device, or forget your password."
        )}
      </p>
      <p className="mt-[1em]">
        <Trans
          t={t}
          components={{
            Link: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
                target="_blank"
                className="text-body opacity-100"
              ></a>
            ),
          }}
          defaults="We strongly encourage you to back up your recovery phrase by writing it down and storing
          it in a secure location. <Link>Learn more</Link>"
        ></Trans>
      </p>
    </div>
  )
}

const MnemonicFormInner = () => {
  const { t } = useTranslation()
  const { mnemonic, acknowledge, wordsCount, setWordsCount } = useMnemonicCreateModal()
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [canConfirm, setCanConfirm] = useState(false)

  const handleContinueClick = useCallback(() => {
    if (!mnemonic) return
    acknowledge(confirmed)
  }, [acknowledge, confirmed, mnemonic])

  const handleMnemonicRevealed = useCallback(() => {
    setCanConfirm(true)
  }, [])

  return (
    <div className={classNames("flex grow flex-col")}>
      <div>
        <div className="flex items-center justify-end gap-4 py-4 text-sm">
          <MnemonicWordCountSwitch value={wordsCount} onChange={setWordsCount} />{" "}
          <Tooltip placement="bottom-end">
            <TooltipTrigger className="hover:text-body">
              <InfoIcon className="text-body-secondary inline" />
            </TooltipTrigger>
            <TooltipContent>
              {t(
                "The 12-word phrase is easier to remember, while the 24-word phrase offers higher entropy and is more resistant to brute force attacks."
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <Mnemonic mnemonic={mnemonic} onReveal={handleMnemonicRevealed} />
      </div>

      <div className="mt-6 flex flex-col gap-6 px-4 pt-4">
        <Checkbox
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="text-body-secondary hover:text-body [&>span]:leading-paragraph  !gap-8"
        >
          {t(
            "I acknowledge that the loss of my recovery phrase will result in the loss of all the assets in my wallet"
          )}
        </Checkbox>
        <Checkbox
          disabled={!canConfirm}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="text-body-secondary hover:text-body [&>span]:leading-paragraph !gap-8"
        >
          {t("I have backed up my recovery phrase")}
        </Checkbox>
      </div>
      <Button
        className="mt-8"
        primary
        fullWidth
        onClick={handleContinueClick}
        disabled={!acknowledged}
      >
        {t("Continue")}
      </Button>
    </div>
  )
}

const MnemonicCreateForm = () => {
  return (
    <div className={classNames("flex flex-col gap-12")}>
      <Description />
      <MnemonicFormInner />
    </div>
  )
}

type BackupCreateResult = { mnemonic: string; confirmed: boolean } | null
type BackupCreateResultCallback = { resolve: (result: BackupCreateResult) => void }

const useMnemonicCreateProvider = () => {
  // keep data in state here to reuse same values if user closes and reopens modal
  const [wordsCount, setWordsCount] = useState<12 | 24>(12)
  const [mnemonic12] = useState<string>(mnemonicGenerate(12))
  const [mnemonic24] = useState<string>(mnemonicGenerate(24))

  const mnemonic = useMemo(() => {
    switch (wordsCount) {
      case 12:
        return mnemonic12
      case 24:
        return mnemonic24
    }
  }, [mnemonic12, mnemonic24, wordsCount])

  const [callback, setCallback] = useState<BackupCreateResultCallback>()

  const acknowledge = useCallback(
    (confirmed: boolean) => {
      if (!callback) return
      callback.resolve({ mnemonic, confirmed })
      setCallback(undefined)
    },
    [mnemonic, callback]
  )

  const cancel = useCallback(() => {
    if (!callback) return
    callback.resolve(null)
    setCallback(undefined)
  }, [callback])

  const generateMnemonic = useCallback(() => {
    return new Promise<BackupCreateResult>((resolve) => {
      setCallback({ resolve })
    })
  }, [])

  return {
    mnemonic,
    isOpen: !!callback,
    cancel,
    acknowledge,
    wordsCount,
    setWordsCount,
    generateMnemonic,
  }
}

export const [MnemonicCreateModalProvider, useMnemonicCreateModal] =
  provideContext(useMnemonicCreateProvider)

export const MnemonicCreateModal = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, cancel, isOpen } = useMnemonicCreateModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={cancel}>
      <ModalDialog className="!min-w-[64rem]" title={t("New recovery phrase")} onClose={cancel}>
        {!!mnemonic && <MnemonicCreateForm />}
      </ModalDialog>
    </Modal>
  )
}
