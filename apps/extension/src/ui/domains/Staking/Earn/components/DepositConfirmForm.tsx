import { LoaderIcon } from "@talismn/icons"
import { Suspense, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import { TxSubmitButtonTransaction } from "@ui/domains/Sign/TxSubmitButton/types"
import { useSelectedCurrency } from "@ui/state"

import { DepositProvider } from "./DepositProvider"
import { useDepositFunds } from "./useDepositFunds"

const AmountDisplay = () => {
  const { deposit, token } = useDepositFunds()
  const amount = deposit

  if (!amount || !token) return <div className="bg-grey-750 h-12 w-64 animate-pulse rounded-sm" />

  return (
    <div className="flex w-full items-center justify-end gap-4 text-right">
      <TokenLogo tokenId={token.id} className="text-lg" />
      <TokensAndFiat tokenId={token.id} planck={amount?.planck} noCountUp />
    </div>
  )
}

const NetworkDisplay = () => {
  const { network } = useDepositFunds()

  if (!network) return null

  return (
    <div className="text-body flex items-center gap-4">
      <NetworkLogo networkId={network.id} className="text-md" />
      {network.name}
    </div>
  )
}

const ProductDisplay = () => {
  const { product, token } = useDepositFunds()

  if (!product || !token) return null

  const { metadata, rewardRate } = product
  const apy = rewardRate.total * 100

  return (
    <div className="flex w-full items-center justify-between">
      <div>Protocol</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img
            src={metadata.logoURI || undefined}
            alt={metadata.name}
            className="h-6 w-6 rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
          <div className="text-right">
            <div className="text-sm font-medium">{metadata.name}</div>
            <div className="text-body-secondary text-xs">{token.symbol}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-[#D5FF5C]">{apy.toFixed(2)}% APY</div>
        </div>
      </div>
    </div>
  )
}

const TotalAmountRow = () => {
  const { t } = useTranslation()
  const { deposit, tokenRates, estimatedFee } = useDepositFunds()
  const amount = deposit

  const currency = useSelectedCurrency()

  const totalValue = useMemo(() => {
    if (!amount || !tokenRates || !estimatedFee) return null

    const fiatAmount = amount.fiat(currency) ?? 0
    const fiatFee = estimatedFee.fiat(currency) ?? 0

    return fiatAmount + fiatFee
  }, [amount, currency, estimatedFee, tokenRates])

  if (!totalValue) return null

  return (
    <div className="mt-4 flex h-[1.7rem] justify-between text-xs">
      <div className="text-body-secondary">{t("Total Amount")}</div>
      <div className="text-body">
        {totalValue ? (
          <Fiat amount={totalValue} />
        ) : (
          <LoaderIcon className="animate-spin-slow mr-2 inline align-text-top" />
        )}
      </div>
    </div>
  )
}

const DepositSubmitButton = () => {
  const { t } = useTranslation()
  const { account, token, product, deposit } = useDepositFunds()
  const [isSubmitting, _setIsSubmitting] = useState(false)

  const transaction: TxSubmitButtonTransaction | null = useMemo(() => {
    if (!account || !token || !product || !deposit) return null

    // Mock transaction - in real implementation, this would create the actual deposit transaction
    return {
      platform: "ethereum" as const,
      networkId: token.networkId as `0x${string}`,
      payload: {
        to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        value: BigInt(deposit.planck),
        data: "0x" as `0x${string}`,
      },
    }
  }, [account, token, product, deposit])

  if (!transaction) return null

  return (
    <TxSubmitButton
      tx={transaction}
      label={isSubmitting ? t("Depositing...") : t("Deposit")}
      disabled={isSubmitting}
      onSubmit={(txId) => {
        // eslint-disable-next-line no-console
        console.log("Deposit transaction successful:", txId)
        // Navigate to success page
      }}
    />
  )
}

interface DepositConfirmFormProps {
  onBack?: () => void
  onClose?: () => void
}

export const DepositConfirmForm = ({
  onBack: _onBack,
  onClose: _onClose,
}: DepositConfirmFormProps) => {
  const { t } = useTranslation()
  const { account, token, product, deposit, estimatedFee } = useDepositFunds()

  if (!account || !token || !product || !deposit) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center text-gray-400">{t("Loading deposit details...")}</div>
      </div>
    )
  }

  return (
    <DepositProvider>
      <ScrollContainer className="flex h-full w-full flex-col overflow-hidden px-12 pb-8">
        <Suspense fallback={<SuspenseTracker name="DepositConfirmForm" />}>
          <div className="flex h-full w-full flex-col gap-6">
            {/* Account */}
            <div className="bg-grey-850 rounded-lg p-6">
              <div className="flex w-full items-center justify-between">
                <div>{t("Account")}</div>
                <AddressDisplay address={account.address} networkId={token.networkId} />
              </div>
            </div>

            {/* Amount */}
            <div className="bg-grey-850 rounded-lg p-6">
              <div className="flex w-full items-center justify-between">
                <div>{t("Amount")}</div>
                <AmountDisplay />
              </div>
            </div>

            {/* Protocol */}
            <div className="bg-grey-850 rounded-lg p-6">
              <ProductDisplay />
            </div>

            {/* Network */}
            <div className="bg-grey-850 rounded-lg p-6">
              <div className="flex w-full items-center justify-between">
                <div>{t("Network")}</div>
                <NetworkDisplay />
              </div>
            </div>

            {/* Fees */}
            <div className="bg-grey-850 rounded-lg p-6">
              <div className="flex w-full items-center justify-between">
                <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
                <div className="flex grow items-center justify-end gap-2 truncate">
                  {estimatedFee && (
                    <TokensAndFiat planck={estimatedFee.planck} tokenId={token.id} />
                  )}
                </div>
              </div>
              <TotalAmountRow />
            </div>

            {/* Submit Button */}
            <div className="mt-auto">
              <DepositSubmitButton />
            </div>
          </div>
        </Suspense>
      </ScrollContainer>
    </DepositProvider>
  )
}
