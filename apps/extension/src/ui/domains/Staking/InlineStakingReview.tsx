import { TalismanEyeIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { InlineStakingAccount } from "./InlineStakingAccount"
import { useInlineStakingWizard } from "./useInlineStakingWizard"

export const InlineStakingReview = () => {
  const { t } = useTranslation()
  const { pool, token, formatter, account } = useInlineStakingWizard()

  if (!account) return null

  return (
    <div className="flex size-full flex-col">
      <h2 className="mb-24 mt-8 text-center">{t("You are staking")}</h2>
      <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
        <div className="flex items-center justify-between gap-8 pb-2">
          <div>{t("Amount")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <TokenLogo tokenId={token?.id} className="shrink-0 text-lg" />
            <TokensAndFiat
              isBalance
              tokenId={token?.id}
              planck={formatter?.planck}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2">
          <div>{t("Account")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <InlineStakingAccount address={account.address} chainId={token?.chain?.id} />
          </div>
        </div>
        <div className="py-8">
          <hr className="text-grey-800" />
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div>{t("Pool")} </div>
          <div>
            <div className="text-body-secondary bg-grey-800 flex h-12 items-center gap-2 rounded px-4">
              <TalismanEyeIcon />
              <div>{pool?.name}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2 text-xs">
          <div>{t("Estimated Fee")} </div>
          <div>
            <TokensAndFiat
              isBalance
              tokenId={token?.id}
              planck={100000000n}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      <Button primary>{t("Confirm")}</Button>
    </div>
  )
}
