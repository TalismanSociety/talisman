import { Card } from "@talisman/components/Card"
import { BraveIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

type Props = {
  className?: string
  onLearnMoreClick?: () => void
}

export const BraveWarningCard = ({ className, onLearnMoreClick }: Props) => {
  const { t } = useTranslation()
  return (
    <Card
      className={classNames("mt-10", className)}
      title={
        <div className="flex w-full items-center gap-5">
          <BraveIcon className="inline" />
          <span>{t("Attention Brave users")}</span>
        </div>
      }
      description={
        <span className="text-body-secondary text-sm">
          {t("Due to a recent update, users may be experiencing issues loading balances.")}
        </span>
      }
      cta={
        <Button className="w-full" onClick={onLearnMoreClick}>
          {t("Learn more")}
        </Button>
      }
    />
  )
}
