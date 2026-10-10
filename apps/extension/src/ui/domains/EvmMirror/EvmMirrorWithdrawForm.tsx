import { Button } from "@ui/components/Button"
import { ModalDialog } from "@ui/components/ModalDialog"
import { TokenAmountField } from "@ui/domains/Asset/TokenAmountField"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { StakingAccountDisplay } from "@ui/domains/Staking/shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useTranslation } from "react-i18next"

import { useEvmMirrorWithdrawWizard } from "./useEvmMirrorWithdrawWizard"

export const EvmMirrorWithdrawForm = () => {
  const { t } = useTranslation()
  const {
    form,
    address,
    token,
    withdrawablePlancks,
    plancks,
    setPlancks,
    errorMessage,
    canSubmit,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
  } = useEvmMirrorWithdrawWizard()

  if (!address || !token) return null

  return (
    <ModalDialog
      variant="wizard"
      title={t("Withdraw EVM Balance")}
      onCloseClick={close}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <form
        className="flex size-full flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Account")}</div>
            <StakingAccountDisplay address={address} chainId={token.networkId} />
          </div>
        </div>

        <TokenAmountField
          tokenId={token.id}
          decimals={token.decimals}
          symbol={token.symbol}
          plancks={plancks}
          maxPlancks={withdrawablePlancks}
          onChange={setPlancks}
          errorMessage={errorMessage}
        />

        <div className="flex flex-col gap-1 rounded bg-grey-900 px-8 py-6 text-body-secondary text-xs leading-paragraph">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("EVM balance")}</div>
            <TokensAndFiat
              planck={withdrawablePlancks}
              tokenId={token.id}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Estimated fee")}</div>
            <div className="overflow-hidden">
              <StakingFeeEstimate
                plancks={feeEstimate}
                tokenId={token.id}
                isLoading={isLoadingFeeEstimate}
                error={errorFeeEstimate}
              />
            </div>
          </div>
        </div>

        <Button type="submit" primary disabled={!canSubmit} className="shrink-0">
          {t("Review")}
        </Button>
      </form>
    </ModalDialog>
  )
}
