import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, WizardModalDialog } from "talisman-ui"

import { AddressPillButton } from "@ui/domains/Account/AccountPillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AmountEdit } from "@ui/domains/Earn/shared/AmountEdit"
import { YieldxyzProviderLogo } from "@ui/domains/Earn/shared/YieldxyzProviderLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"

import { FormFieldSet, FormFieldSetRow } from "../../shared/FormFieldSet"
import { useEarnDepositWizard } from "../context"
import { useEarnDepositModal } from "../useEarnDepositModal"

export const EarnDepositStepAmount = () => {
  const { t } = useTranslation()
  const { close } = useEarnDepositModal()
  const { address, goTo, canCreateAction, createAction } = useEarnDepositWizard()

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
            <FormFieldSetRow label={t("Expected Yield")} variant="xs">
              <YieldDisplay />
            </FormFieldSetRow>
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

// const TransactionsCountDisplay = () => {
//   const { action } = useEarnDepositWizard()

//   if (!action) return null

//   return (
//     <Tooltip>
//       <TooltipTrigger asChild>
//         <div className="text-body">{action.transactions.length}</div>
//       </TooltipTrigger>
//       <TooltipContent>
//         {action.transactions.map((tx, index) => (
//           <div key={index} className="text-xs">
//             {tx.title}
//           </div>
//         ))}
//       </TooltipContent>
//     </Tooltip>
//   )
// }

const ProductDisplay = () => {
  const { product } = useEarnDepositWizard()

  if (!product) return null

  return (
    <div className="text-body flex w-full items-center gap-2 overflow-hidden">
      <YieldxyzProviderLogo className="size-8" providerId={product.providerId} />
      <div className="truncate">{product.metadata.name}</div>
    </div>
  )
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
