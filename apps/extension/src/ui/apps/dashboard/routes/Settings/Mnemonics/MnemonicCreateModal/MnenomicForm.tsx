import { InfoIcon } from "@talismn/icons"
import { Mnemonic } from "@ui/domains/Mnemonic/Mnemonic"
import { MnemonicWordCountSwitch } from "@ui/domains/Mnemonic/MnemonicWordCountSwitch"
import { Button } from "@ui/talisman-ui/components/Button"
import { Checkbox } from "@ui/talisman-ui/components/Checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

import { Stages, useMnemonicCreateModal } from "./context"
import { MnemonicCreateModalDialog } from "./Dialog"

const MnemonicFormInner = () => {
  const { t } = useTranslation()
  const { mnemonic, setConfirmed, wordsCount, setWordsCount, setStage, complete } =
    useMnemonicCreateModal()
  const [canConfirm, setCanConfirm] = useState(false)

  const handleContinueClick = useCallback(() => {
    if (!mnemonic) return
    setStage(Stages.Verify)
  }, [mnemonic, setStage])

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
              <InfoIcon className="inline text-body-secondary" />
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

      <div className="flex flex-col gap-8">
        <Checkbox
          disabled={!canConfirm}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="!gap-8 text-body-secondary text-sm hover:text-body [&>span]:leading-paragraph"
        >
          {t("I have backed up my recovery phrase, don’t remind me anymore")}
        </Checkbox>
        <div className="flex flex-col gap-6">
          <Button primary fullWidth disabled={!canConfirm} onClick={handleContinueClick}>
            {t("Verify recovery phrase")}
          </Button>
          <button
            className="flex h-11 cursor-pointer gap-5 self-center font-bold text-grey-300 text-sm hover:text-body"
            onClick={complete}
            type="button"
            data-testid="mnemonic-skip-verification-button"
          >
            {t("Skip Verification")}
          </button>
        </div>
      </div>
    </div>
  )
}

export const MnemonicCreateForm = () => {
  const { t } = useTranslation()
  return (
    <MnemonicCreateModalDialog title={t("New recovery phrase")}>
      <div className={"flex w-full min-w-[58rem] flex-col"}>
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
