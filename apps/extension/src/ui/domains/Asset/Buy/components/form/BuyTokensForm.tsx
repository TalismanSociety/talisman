import { useTranslation } from "react-i18next"

import { BuyTokensLayout } from "../BuyTokensLayout"

export const BuyTokensForm = () => {
  const { t } = useTranslation()
  return (
    <BuyTokensLayout title={t("Buy/Sell")} withBackLink>
      <div>Buy Tokens Form</div>
    </BuyTokensLayout>
  )
}
