import { InfoIcon, SaveIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const ProxyDelayForm: FC<{
  delay: string
  onSave: (delay: string) => void
  onClose: () => void
}> = ({ delay, onSave, onClose }) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(delay)
  const refInput = useRef<HTMLInputElement>(null)

  const parsedValue = useMemo(() => Number.parseInt(value, 10), [value])
  const isValid = useMemo(() => Number.isInteger(parsedValue) && parsedValue >= 0, [parsedValue])

  const handleSubmit = useCallback(() => {
    if (!isValid) return
    onSave(value)
    onClose()
  }, [isValid, onClose, onSave, value])

  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") {
      refInput.current?.select()
      refInput.current?.focus()
    }
  }, [status])

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-body-secondary text-sm">
        {t("Set how many blocks must pass between announcing and executing a proxied transaction.")}
      </p>
      <div>
        <div className="mb-2 text-body-secondary text-sm">{t("Delay (blocks)")}</div>
        <FormFieldInputText
          ref={refInput}
          small
          type="number"
          containerProps={{ className: "px-6 text-right" }}
          after={<div className="text-body-secondary">{t("blocks")}</div>}
          placeholder="0"
          onChange={(e) => setValue(e.target.value)}
          value={value}
        />
      </div>

      <div className="flex w-full items-center gap-2 rounded-sm border border-body-disabled p-3 text-body-inactive text-xs">
        <InfoIcon className="shrink-0 text-md" />
        <div>
          {t(
            "Delayed proxies (delay > 0) require an announcement workflow which Talisman doesn't support at this time."
          )}
        </div>
      </div>
      <div className="mt-4 flex w-full items-center">
        <Button
          className="w-full"
          icon={SaveIcon}
          primary
          disabled={!isValid}
          onClick={handleSubmit}
        >
          {t("Save")}
        </Button>
      </div>
    </div>
  )
}
