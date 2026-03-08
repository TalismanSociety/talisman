import { ShieldSuccessIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { useTranslation } from "react-i18next"

export const VerificationComplete = ({ onComplete }: { onComplete: () => void }) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="flex-col gap-12">
        <div className="flex flex-col gap-4 rounded py-12">
          <div className="flex flex-col items-center justify-center gap-8 self-stretch text-primary-700">
            <ShieldSuccessIcon className="h-20 w-16" />
            <span className="text-center font-semibold text-lg leading-paragraph">
              {t("Verification Successful")}
            </span>
          </div>
          <span className="text-center font-400 text-body leading-10">
            {t("Your recovery phrase has been verified.")}
          </span>
        </div>
      </div>
      <Button primary onClick={onComplete} fullWidth>
        {t("Done")}
      </Button>
    </>
  )
}
