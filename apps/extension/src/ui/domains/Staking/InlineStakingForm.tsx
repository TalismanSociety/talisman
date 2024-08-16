import { Token } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { AccountJsonAny } from "extension-core"
import { FC, Suspense } from "react"
import { useTranslation } from "react-i18next"
import { Button, PillButton } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useBalance } from "@ui/hooks/useBalance"

import { TokenLogo } from "../Asset/TokenLogo"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { AccountPillButton } from "./AccountPillButton"
import { InlineStakingAccountPicker } from "./InlineStakingAccountPicker"
import { useInlineStakingForm } from "./useInlineStaking"

const AssetPill: FC<{ token: Token | null }> = ({ token }) => {
  const { t } = useTranslation()

  if (!token) return null

  return (
    <PillButton className="h-16 rounded px-4">
      <div className="flex items-center gap-4">
        <TokenLogo tokenId={token.id} className="shrink-0 text-lg" />
        <div className="flex items-center gap-2">
          <div className="text-body text-base">{token.symbol}</div>
          <div className="bg-body-disabled inline-block size-2 rounded-full"></div>
          <div className="text-body-secondary text-sm">{t("Pooled Staking")}</div>
        </div>
      </div>
    </PillButton>
  )
}

const AvailableBalance: FC<{ token: Token; account: AccountJsonAny }> = ({ token, account }) => {
  const balance = useBalance(account.address, token.id)

  return (
    <TokensAndFiat
      isBalance
      tokenId={token?.id}
      planck={balance.transferable.planck}
      className={classNames(balance.status !== "live" && "animate-pulse")}
      tokensClassName="text-body"
      fiatClassName="text-body-secondary"
    />
  )
}

export const InlineStakingForm = () => {
  const { t } = useTranslation()
  const { account, accountPicker, token } = useInlineStakingForm()

  return (
    <div className="text-body-secondary flex size-full flex-col gap-4">
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm">
        <div className="flex h-16 items-center justify-between">
          <div>{t("Asset")}</div>
          <div>
            <AssetPill token={token} />
          </div>
        </div>
        <div className="flex h-16 items-center justify-between">
          <div>{t("Account")}</div>
          <div>
            <Suspense fallback={<SuspenseTracker name="AccountPillButton" />}>
              <AccountPillButton address={account?.address} onClick={accountPicker.open} />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="grow"></div>
      <div className="bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-xs">
        <div className="flex items-center justify-between ">
          <div>{t("Available Balance")}</div>
          <div>{!!token && !!account && <AvailableBalance token={token} account={account} />}</div>
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
