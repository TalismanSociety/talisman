import { formatDuration, intervalToDuration } from "date-fns"
import { TimePeriodDto } from "extension-core"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, WizardModalDialog } from "talisman-ui"

import { AddressPillButton } from "@ui/domains/Account/AccountPillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AmountEdit } from "@ui/domains/Earn/shared/AmountEdit"
import { YieldxyzProviderDisplay } from "@ui/domains/Earn/shared/YieldxyzProviderLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { useYieldxyzProvider } from "@ui/state/yield"

import { FormFieldSet, FormFieldSetRow } from "../../shared/FormFieldSet"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepAmount = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { address, goTo, canCreateAction, createAction, product } = useEarnDepositWizard()

  const [processing, setProcessing] = useState(false)

  const handleSubmit = async () => {
    setProcessing(true)
    try {
      await createAction()
      goTo("confirm")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <WizardModalDialog className="size-full border-none" title="Deposit" onCloseClick={close}>
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <FormFieldSet>
          <FormFieldSetRow label={t("Account")}>
            <AddressPillButton
              className="!w-full"
              address={address}
              onClick={() => goTo("account")}
            />
          </FormFieldSetRow>
        </FormFieldSet>
        <div className="grow">
          <DepositAmountEdit />
        </div>
        <div className="flex w-full flex-col gap-4">
          <FormFieldSet>
            <FormFieldSetRow label={t("Available Balance")} variant="xs">
              <AvailableBalance />
            </FormFieldSetRow>
          </FormFieldSet>
          <FormFieldSet>
            <FormFieldSetRow label={t("DeFi Product")} variant="xs">
              <ProductDisplay />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Provider")} variant="xs">
              <ProviderDisplay />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Expected Yield")} variant="xs">
              <YieldDisplay />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Claim Mechanism")} variant="xs">
              <ClaimMechanismDisplay />
            </FormFieldSetRow>
            {!!product?.mechanics.lockupPeriod && (
              <FormFieldSetRow
                label={t("Lockup Period")}
                description={t("Minimum time before exit can be initiated")}
                variant="xs"
              >
                <PeriodDisplay period={product.mechanics.lockupPeriod} />
              </FormFieldSetRow>
            )}
            {!!product?.mechanics.cooldownPeriod && (
              <FormFieldSetRow
                label={t("Cooldown Period")}
                description={t("Time required before exit is allowed")}
                variant="xs"
              >
                <PeriodDisplay period={product.mechanics.cooldownPeriod} />
              </FormFieldSetRow>
            )}
          </FormFieldSet>
          <FormFieldSet>
            <FormFieldSetRow label={t("Network")} variant="xs">
              <NetworkDisplay />
            </FormFieldSetRow>
            {/* <FormFieldSetRow label={t("Transactions Count")} variant="xs">
              <TransactionsCountDisplay />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Transaction Priority")} variant="xs">
              <AvailableBalance />
            </FormFieldSetRow> */}
            <FormFieldSetRow label={t("Estimated Fee")} variant="xs">
              <EstimatedFee />
            </FormFieldSetRow>
          </FormFieldSet>
        </div>
        <Button primary disabled={!canCreateAction} processing={processing} onClick={handleSubmit}>
          {t("Review")}
        </Button>
      </div>
    </WizardModalDialog>
  )
}

const PeriodDisplay = ({ period }: { period: TimePeriodDto }) => {
  const locale = useDateFnsLocale()
  const duration = useMemo(
    () => intervalToDuration({ start: 0, end: period.seconds * 1000 }),
    [period.seconds],
  )

  return formatDuration(duration, { locale })
}

const ClaimMechanismDisplay = () => {
  const { t } = useTranslation()

  const { product } = useEarnDepositWizard()

  return useMemo(() => {
    if (!product) return null

    const mode = product.mechanics.rewardClaiming === "auto" ? t("Automatic") : t("Manual")

    switch (product.mechanics.rewardSchedule) {
      case "block":
        return t(`{{mode}} every block`, { mode })
      case "campaign":
        return t(`{{mode}} every campaign`, { mode })
      case "day":
        return t(`{{mode}} daily`, { mode })
      case "week":
        return t(`{{mode}} weekly`, { mode })
      case "month":
        return t(`{{mode}} monthly`, { mode })
      case "epoch":
        return t(`{{mode}} every epoch`, { mode })
      case "era":
        return t(`{{mode}} every era`, { mode })
      case "hour":
        return t(`{{mode}} hourly`, { mode })
    }

    return
  }, [product, t])
}

const ProductDisplay = () => {
  const { product } = useEarnDepositWizard()

  if (!product) return null

  return product.metadata.name
  // <div className="text-body flex w-full items-center gap-2 overflow-hidden">
  //   <YieldxyzProviderLogo className="size-8" providerId={product.providerId} />
  //   <div className="truncate">{}</div>
  // </div>
}

const ProviderDisplay = () => {
  const { product } = useEarnDepositWizard()
  const { data: provider } = useYieldxyzProvider(product?.providerId)

  if (!provider) return null

  return <YieldxyzProviderDisplay providerId={product?.providerId} className="text-body" />

  // return (
  //   <div className="text-body flex w-full items-center gap-2 overflow-hidden">
  //     <YieldxyzProviderLogo className="size-8" providerId={provider.id} />
  //     <div className="truncate">{provider.name}</div>
  //   </div>
  // )
}

// TODO tooltip to detail rewards from product.rewardRate.components
const YieldDisplay = () => {
  const { product } = useEarnDepositWizard()

  const text = useMemo(() => {
    if (!product) return null

    const percent = Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(product.rewardRate.total)

    return `${percent} ${product.rewardRate.rateType}`
  }, [product])

  if (!text) return null

  return <div className="text-body">{text}</div>
}

const EstimatedFee = () => {
  const { estimatedFeeTotal, nativeToken } = useEarnDepositWizard()

  if (!estimatedFeeTotal || !nativeToken) return null

  return <TokensAndFiat planck={estimatedFeeTotal} tokenId={nativeToken.id} />
}

const NetworkDisplay = () => {
  const { tokenIn } = useEarnDepositWizard()

  if (!tokenIn) return null

  return (
    <div className="text-body flex w-full items-center gap-2 overflow-hidden">
      <NetworkLogo className="size-8" networkId={tokenIn.networkId} />
      <NetworkName className="truncate" networkId={tokenIn.networkId} />
    </div>
  )
}

const DepositAmountEdit = () => {
  const { tokenIn, amountIn, onAmountInChanged } = useEarnDepositWizard()

  if (!tokenIn) throw new Error("TokenIn is not defined")

  return (
    <AmountEdit
      tokenId={tokenIn.id}
      value={amountIn}
      onValueChanged={onAmountInChanged}
      onMaxClick={() => {}}
    />
  )
}

const AvailableBalance = () => {
  const { balance, tokenIn } = useEarnDepositWizard()

  if (!balance || !tokenIn) return null

  return (
    <TokensAndFiat
      planck={balance.transferable.planck}
      tokenId={tokenIn.id}
      noCountUp
      isBalance
      tokensClassName="text-body"
    />
  )
}
