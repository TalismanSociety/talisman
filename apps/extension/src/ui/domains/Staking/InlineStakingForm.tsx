import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { AccountPillButton } from "./AccountPillButton"
import { InlineStakingAccountPicker } from "./InlineStakingAccountPicker"
import { useInlineStakingForm } from "./useInlineStaking"

export const InlineStakingForm = () => {
  const { t } = useTranslation()
  const { account, accountPicker } = useInlineStakingForm()

  return (
    <div className="text-body-secondary flex size-full flex-col gap-4">
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm">
        <div className="flex h-16 items-center justify-between">
          <div>{t("Asset")}</div>
          <div></div>
        </div>
        <div className="flex h-16 items-center justify-between">
          <div>{t("Account")}</div>
          <div>
            <AccountPillButton address={account?.address} onClick={accountPicker.open} />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between ">
          <div>{t("Available Balance")}</div>
          <div></div>
        </div>
      </div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex h-12 items-center justify-between ">
          <div>{t("Pool")}</div>
          <div></div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("APY")}</div>
          <div></div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("Unbonding Period")}</div>
          <div></div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t("Estimated Fee")}</div>
          <div></div>
        </div>
      </div>
      <div></div>
      <Button primary fullWidth>
        {t("Review")}
      </Button>

      <InlineStakingAccountPicker />
    </div>
  )
}
