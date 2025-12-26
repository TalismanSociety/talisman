import { formatDuration, intervalToDuration } from "date-fns"
import { TimePeriodDto } from "extension-core"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, WizardModalDialog } from "talisman-ui"

import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { GenericTokensAndFiat } from "@ui/domains/Asset/GenericTokensAndFiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { AccountDisplay } from "@ui/domains/Earn/shared/AccountDisplay"
import { YieldxyzProviderDisplay } from "@ui/domains/Earn/yieldxyz/components/YieldxyzProviderLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

import { FormFieldSet, FormFieldSetRow } from "../../../shared/FormFieldSet"
import { YieldxyzProductTitleDisplay } from "../../components/YieldxyzProductTitleDisplay"
import { YieldxyzProductYieldDisplay } from "../../components/YieldxyzProductYieldDisplay"
import { useYieldxyzClaimModal } from "../useYieldxyzClaimModal"
import { useYieldxyzClaimWizard } from "../useYieldxyzClaimWizard"

export const YieldxyzClaimStepAmount = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzClaimModal()
  const { position, goTo, canCreateAction, createAction, network } = useYieldxyzClaimWizard()

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

  if (!position?.product) return null

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={"Claim Rewards"}
      onCloseClick={close}
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <FormFieldSet>
          <FormFieldSetRow label={t("Account")} className="h-[2em]">
            <AccountDisplay
              address={position.address}
              ss58Format={network?.platform === "polkadot" ? network.prefix : undefined}
              className="h-[2em]"
            />
          </FormFieldSetRow>
        </FormFieldSet>
        <div className="grow">
          <AmountToClaim />
        </div>
        <div className="flex w-full flex-col gap-4">
          <FormFieldSet>
            <FormFieldSetRow label={t("Position Balance")} variant="xs">
              <PositionBalance />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Network")} variant="xs">
              <NetworkDisplay />
            </FormFieldSetRow>
          </FormFieldSet>
          <FormFieldSet>
            <FormFieldSetRow label={t("DeFi Product")} variant="xs">
              <YieldxyzProductTitleDisplay product={position.product} />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Provider")} variant="xs">
              <YieldxyzProviderDisplay providerId={position.product.providerId} />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Expected Rewards")} variant="xs">
              <YieldxyzProductYieldDisplay product={position.product} />
            </FormFieldSetRow>
            <FormFieldSetRow label={t("Claim Mechanism")} variant="xs">
              <ClaimMechanismDisplay />
            </FormFieldSetRow>
            <FormFieldSetRow
              label={t("Warmup Period")}
              description={t("Warmup period before rewards start accruing")}
              variant="xs"
            >
              <PeriodDisplay period={position.product.mechanics.warmupPeriod} />
            </FormFieldSetRow>
            <FormFieldSetRow
              label={t("Lockup Period")}
              description={t("Minimum time before exit can be initiated")}
              variant="xs"
            >
              <PeriodDisplay period={position.product.mechanics.lockupPeriod} />
            </FormFieldSetRow>
            <FormFieldSetRow
              label={t("Cooldown Period")}
              description={t("Time required before exit is allowed")}
              variant="xs"
            >
              <PeriodDisplay period={position.product.mechanics.cooldownPeriod} />
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

const PeriodDisplay = ({ period }: { period: TimePeriodDto | undefined }) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  return useMemo(() => {
    if (!period?.seconds) return t("None")
    const duration = intervalToDuration({ start: 0, end: period.seconds * 1000 })
    return formatDuration(duration, { locale })
  }, [locale, period?.seconds, t])
}

const ClaimMechanismDisplay = () => {
  const { t } = useTranslation()

  const { position } = useYieldxyzClaimWizard()

  return useMemo(() => {
    if (!position?.product) return null

    const mode = position.product.mechanics.rewardClaiming === "auto" ? t("Automatic") : t("Manual")

    switch (position.product.mechanics.rewardSchedule) {
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
  }, [position, t])
}

const NetworkDisplay = () => {
  const { position } = useYieldxyzClaimWizard()

  if (!position) return null

  return (
    <div className="text-body flex w-full items-center gap-2 overflow-hidden">
      <NetworkLogo className="size-8" networkId={position.networkId} />
      <NetworkName className="truncate" networkId={position.networkId} />
    </div>
  )
}

const AmountToClaim = () => {
  const { balance } = useYieldxyzClaimWizard()

  if (!balance) throw new Error("TokenIn is not defined")

  return (
    <div className="text-md flex size-full flex-col items-center justify-center overflow-hidden">
      <GenericTokensAndFiat
        noFiat
        symbol={balance.token.symbol}
        decimals={balance.token.decimals}
        planck={balance.amountRaw}
      />
    </div>
  )
}

const PositionBalance = () => {
  const { balance } = useYieldxyzClaimWizard()

  if (!balance) return null

  return (
    <>
      <Tokens
        amount={balance.amount}
        symbol={balance.token.symbol}
        decimals={balance.token.decimals}
        isBalance
        noCountUp
      />
      {!!balance.amountUsd && (
        <span className="text-body-secondary">
          {" "}
          (<FiatFromUsd amount={Number(balance.amountUsd)} noCountUp isBalance />)
        </span>
      )}
    </>
  )
}
