import { InfoIcon } from "@talismn/icons"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { MnemonicWordCountSwitch } from "@ui/domains/Mnemonic/MnemonicWordCountSwitch"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

const MnemonicFormInner = () => {
  const { t } = useTranslation()
  const { mnemonic, acknowledge, wordsCount, setWordsCount } = useMnemonicCreateModal()
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
    <div className="flex grow flex-col gap-16">
      <div className="flex flex-col gap-4">
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
        <Mnemonic mnemonic={mnemonic} onReveal={handleMnemonicRevealed} wideLayoutWhen24 />
      </div>

      <div className="flex flex-col gap-8">
        <Checkbox
          disabled={!canConfirm}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="text-body-secondary hover:text-body [&>span]:leading-paragraph !gap-8 text-sm"
        >
          {t("I have backed up my recovery phrase, don’t remind me anymore")}
        </Checkbox>
        <Button className="mt-8" primary fullWidth onClick={handleContinueClick}>
          {t("Create Account")}
        </Button>
      </div>
    </div>
  )
}

export const MnemonicCreateForm = () => {
  const { t } = useTranslation("admin")
  return (
    <MnemonicCreateModalDialog title={t("New recovery phrase")}>
      <div className={"flex flex-col gap-8"}>
        <div className="text-body-secondary text-sm">
          {t(
            "Your recovery phrase gives you access to your wallet and funds. Write it down and store it in a secure location."
          )}
        </div>
        <MnemonicFormInner />
      </div>
    </MnemonicCreateModalDialog>
  )
}
